import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../auth/client.js';
import { fetchSharedData, callMutation } from './sharedData.js';

const empty = () => ({rides:[],requests:[],chats:{},destinations:{}});
export default function useSharedData(user) {
  const [snapshot,setSnapshot]=useState({userId:null,data:empty()});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const active=useRef(null);
  const mutationBusy=useRef(false);
  useEffect(()=>{
    const context={userId:user?.id,alive:true,sequence:0};
    active.current=context;
    setSnapshot({userId:context.userId,data:empty()});setError('');
    if(!user?.id || !supabase) {setLoading(false);return()=>{context.alive=false;};}
    context.refresh=async(force=false)=>{
      if(context.inFlight){
        if(!force)return context.inFlight;
        await context.inFlight;
        if(!context.alive)return;
      }
      const sequence=++context.sequence;
      const work=(async()=>{
      try {
        const data=await fetchSharedData(supabase);
        if(context.alive && sequence===context.sequence) {setSnapshot({userId:context.userId,data});setError('');}
      } catch(failure) {
        if(context.alive && sequence===context.sequence) setError('Unable to sync with the server. Check your connection and retry.');
      } finally {if(context.alive && sequence===context.sequence) setLoading(false);}
      })();
      context.inFlight=work;
      await work;
      if(context.inFlight===work)context.inFlight=null;
    };
    setLoading(true);void context.refresh();
    // Refresh while visible, and immediately on return to the app.
    const refresh=()=>{if(document.visibilityState!=='hidden')void context.refresh();};
    const timer=setInterval(refresh,5000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{context.alive=false;clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[user?.id]);
  const mutate=useCallback(async(name,args)=>{
    const context=active.current;
    if(!context?.alive || !context.userId) throw new Error('Sign in to continue.');
    if(mutationBusy.current) throw new Error('Please wait for the current save to finish.');
    mutationBusy.current=true;setBusy(true);
    try {
      const result=await callMutation(supabase,name,args);
      if(context.alive) await context.refresh(true);
      return result;
    } finally {mutationBusy.current=false;setBusy(false);}
  },[]);
  const refresh=()=>active.current?.refresh?.();
  return {data:snapshot.userId===user?.id?snapshot.data:empty(),loading,error,busy,mutate,refresh};
}
