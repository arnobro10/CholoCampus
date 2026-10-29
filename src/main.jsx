import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { ArrowRight, ArrowUpRight, Bell, CalendarDays, CarFront, Check, ChevronDown, Clock3, Compass, LogOut, MapPin, Menu, MessageCircle, Moon, Navigation, Plus, Search, Send, ShieldCheck, SlidersHorizontal, Users, X } from './Icons.jsx';
import 'leaflet/dist/leaflet.css';
import './style.css';
import './design.css';
import './map-first.css';
import RideMapTiles from './RideMapTiles.jsx';
import MapLocateControl from './MapLocateControl.jsx';
import DestinationPicker from './DestinationPicker.jsx';
import RideLocationPicker from './RideLocationPicker.jsx';
import PlaceSearchResults from './PlaceSearchResults.jsx';
import { applyRideDirection, routePoint } from './rideLocations.js';
import AppBrand from './AppBrand.jsx';
import { SystemThemeProvider, useSystemTheme } from './SystemTheme.jsx';
import { distanceKm } from './destinations.js';
import useSharedData from './data/useSharedData.js';
import { activeOfferInDirection, activeBookingInDirection } from './data/activeRides.js';
import { parseFare, fareLabel } from './data/fares.js';
import useUniversityAuth from './auth/useUniversityAuth.js';
import LoginPanel from './auth/LoginPanel.jsx';
import AccessDialog from './auth/AccessDialog.jsx';
import './auth/auth.css';
import { activeDate, isPast } from './schedule.js';
import { CAMPUS } from './campus.js';

// Shared by the marker, fixed campus routes, and destination picker.
const LOCATIONS = [
  {name:'BRAC University, Merul Badda', coords:CAMPUS},
  {name:'Dhanmondi 27',coords:[23.7571,90.3751]},
  {name:'Uttara Sector 7',coords:[23.8705,90.3985]},
  {name:'Mirpur 10',coords:[23.8067,90.3686]},
  {name:'Bashundhara R/A',coords:[23.8152,90.4333]},
  {name:'Mohakhali DOHS',coords:[23.7894,90.4019]},
  {name:'Rampura',coords:[23.7611,90.4202]},
  {name:'Gulshan 2',coords:[23.7937,90.4146]},
  {name:'Banasree',coords:[23.7657,90.4352]},
  {name:'Farmgate',coords:[23.7577,90.3889]},
];
const readable=(ymd)=>new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric',timeZone:'UTC'});
const ridePoint=ride=>routePoint(ride,ride.direction==='to'?'from':'to',LOCATIONS);
function MapRecenter({point}){const map=useMap();useEffect(()=>{if(point)map.setView(point,15,{animate:false});},[point,map]);return null;}
function MapDismiss({onDismiss}){useMapEvents({click:onDismiss});return null;}
const label=(r)=>r.direction==='to'?'To campus':'From campus';
const timeLabel=(time)=>new Date(`2000-01-01T${time}:00`).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});

function App(){
  const auth=useUniversityAuth();
  const [localPreview,setLocalPreview]=useState(()=>import.meta.env.DEV && ['localhost','127.0.0.1','[::1]'].includes(window.location.hostname));
  const cloud=useSharedData(auth.user);
  const db={...cloud.data,user:auth.user||(localPreview?{id:'local-preview',name:'Local preview',email:'Not signed in'}:null)};
  const theme=useSystemTheme();
  const [destinationOpen,setDestinationOpen]=useState(false);
  const [rideLocationEndpoint,setRideLocationEndpoint]=useState(null);
  const [nearbyOnly,setNearbyOnly]=useState(false);
  const [showRides,setShowRides]=useState(false);
  const preference=db.user?db.destinations?.[db.user.id]:null;
  const [page,setPage]=useState('discover');
  const [tab,setTab]=useState('all');
  const [query,setQuery]=useState('');
  const [searchPlace,setSearchPlace]=useState(null);
  const [selected,setSelected]=useState(null);
  const [date,setDate]=useState(activeDate());
  const [form,setForm]=useState({direction:'to',vehicle:'Car',from:'Dhanmondi 27',to:'BRAC University, Merul Badda',time:'09:00',seats:'2',note:'',fare:'',fromCoords:LOCATIONS[1].coords,toCoords:CAMPUS});
  const [toast,setToast]=useState('');
  const [menu,setMenu]=useState(false);
  const [chatId,setChatId]=useState(null);
  const [draft,setDraft]=useState('');
  const [filterOpen,setFilterOpen]=useState(false);
  const [vehicleFilter,setVehicleFilter]=useState('all');
  const [focus,setFocus]=useState(null);
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{setChatId(null);setDraft('');setSelected(null);setDestinationOpen(false);setRideLocationEndpoint(null);setMenu(false);if(auth.user)setPage('discover')},[auth.user?.id]);
  useEffect(()=>{const t=setInterval(()=>{setNow(Date.now());setDate(activeDate())},30000);return()=>clearInterval(t)},[]);
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),3000);return()=>clearTimeout(t)}},[toast]);
  const notice=t=>setToast(t);
  const allRides=useMemo(()=>db.rides.filter(r=>r.date===date&&!r.cancelled),[db.rides,date]);
  const visible=allRides.filter(r=>(!nearbyOnly||!preference||(ridePoint(r)&&distanceKm(ridePoint(r),preference.coords)<=3))&&(tab==='all'||r.direction===tab)&&(vehicleFilter==='all'||r.vehicle===vehicleFilter)&&(searchPlace?(ridePoint(r)&&distanceKm(ridePoint(r),searchPlace.coords)<=3):[r.from,r.to,r.name].join(' ').toLowerCase().includes(query.toLowerCase()))&&!isPast(r.date,r.time)&&r.seats>0);
  const activeOffer=activeOfferInDirection(db.rides,db.user?.id,form.direction);
  const currentRide=allRides.find(r=>r.id===selected);
  const currentBooking=currentRide&&activeBookingInDirection(db.requests,db.rides,db.user?.id,currentRide.direction);
  const bookingConflict=Boolean(currentBooking&&currentBooking.rideId!==currentRide?.id);
  const requests=db.requests.filter(x=>x.ownerId===db.user?.id||x.requesterId===db.user?.id);
  const requestFor=(r)=>db.requests.find(x=>x.rideId===r.id&&x.requesterId===db.user?.id);
  const applyDirection=direction=>{setRideLocationEndpoint(null);setForm(previous=>applyRideDirection(previous,direction,LOCATIONS[1]));};
  const submitRide=async e=>{
    e.preventDefault();
    if(cloud.busy)return;
    try {
      if(activeOffer)throw new Error('You already have an active offer in this direction.');
      const pickup=routePoint(form,'from',LOCATIONS), destination=routePoint(form,'to',LOCATIONS);
      if(!pickup||!destination)throw new Error('Choose both route locations on the map.');
      const id=await cloud.mutate('publish_ride_at_locations',{p_id:crypto.randomUUID(),p_direction:form.direction,p_pickup:form.from,p_destination:form.to,p_date:date,p_time:form.time,p_vehicle:form.vehicle,p_seats:Number(form.seats),p_note:form.note,p_fare:parseFare(form.fare),p_pickup_lat:pickup[0],p_pickup_lng:pickup[1],p_destination_lat:destination[0],p_destination_lng:destination[1]});
      setPage('discover');setTab('all');setSelected(id);notice('Ride published');
    }catch(failure){notice(failure.message);}
  };
  const requestRide=async ride=>{
    if(cloud.busy)return;
    try {
      const booking=activeBookingInDirection(db.requests,db.rides,db.user?.id,ride.direction);
      if(booking&&booking.rideId!==ride.id)throw new Error('You already have a booking in this direction.');
      const id=await cloud.mutate('request_seat',{p_ride_id:ride.id});
      setSelected(null);setChatId(id);setPage('messages');notice('Conversation opened');
    }catch(failure){notice(failure.message);}
  };
  const sendChat=async e=>{
    e.preventDefault();if(!draft.trim()||!activeChat||cloud.busy)return;
    const sentDraft=draft;
    try {await cloud.mutate('send_message',{p_id:crypto.randomUUID(),p_request_id:activeChat.id,p_body:sentDraft.trim()});setDraft(current=>current===sentDraft?'':current);}
    catch(failure){notice(failure.message);}
  };
  const updateRequest=async(req,status)=>{
    if(cloud.busy)return;
    try{await cloud.mutate('decide_request',{p_request_id:req.id,p_status:status});notice(status==='accepted'?'Seat reserved':'Request declined');}
    catch(failure){notice(failure.message);}
  };
  const cancelRide=async ride=>{
    if(cloud.busy)return;
    try{await cloud.mutate('cancel_ride',{p_ride_id:ride.id});notice('Ride cancelled; history and messages retained');}
    catch(failure){notice(failure.message);}
  };
  const savePreferredDestination=async destination=>{
    await cloud.mutate('save_destination',{p_name:destination.name,p_lat:destination.coords[0],p_lng:destination.coords[1]});
    setDestinationOpen(false);setFocus(destination.coords);notice('Preferred destination saved');
  };
  const logout=async()=>{if(localPreview&&!auth.user){setLocalPreview(false);return;}if(!(await auth.signOut()))return;setChatId(null);setDraft('');setMenu(false);setDestinationOpen(false);setRideLocationEndpoint(null);setPage('discover');};
  const activeChat=requests.find(r=>r.id===chatId);
  const toPage=(p)=>{setSelected(null);setRideLocationEndpoint(null);setPage(p);setMenu(false)};
  if (!db.user) return <div className="signed-out-shell" data-theme={theme}>
    <AccessDialog open={auth.accessDenied} onClose={auth.dismissAccessDenied}/>
    <LoginPanel auth={auth}/>
    <p className="signed-out-credit">A product of <a href="https://nexasity.pages.dev/" target="_blank" rel="noopener noreferrer">Nexasity</a></p>
  </div>;
  return <div className={`app-shell ${page==='discover'?'map-mode':''} ${destinationOpen||rideLocationEndpoint?'picker-open':''}`} data-theme={theme}>
    {localPreview&&!auth.user&&<div className="local-preview-notice" role="status">Local preview � Sign in to publish rides or save changes.<button onClick={()=>setLocalPreview(false)}>Sign in</button></div>}
    <AccessDialog open={auth.accessDenied} onClose={auth.dismissAccessDenied}/>
    <aside className="sidebar">
      <div className="brand"><AppBrand/><small>BRAC University</small></div>
      <div className="side-menu-label">MENU</div>
      <button className={'nav-btn '+(page==='discover'?'active':'')} onClick={()=>toPage('discover')}><Compass size={19}/> Find a ride</button>
      <button className={'nav-btn '+(page==='share'?'active':'')} onClick={()=>toPage('share')}><Plus size={19}/> Offer a ride</button>
      <button className={'nav-btn '+(page==='myrides'?'active':'')} onClick={()=>toPage('myrides')}><CalendarDays size={19}/> My rides <span className="count">{requests.length||''}</span></button>
      <button className={'nav-btn '+(page==='messages'?'active':'')} onClick={()=>toPage('messages')}><MessageCircle size={19}/> Messages</button>
      <div className="sidebar-bottom"><div className="campus-card"><span>🎓</span><b>Better commutes, together.</b><p>Share your route, split your cost, make campus life easier.</p></div><button className="profile" onClick={()=>toPage(db.user?'profile':'login')}><div className="avatar">{db.user?db.user.name[0].toUpperCase():'?'}</div><span><b>{db.user?.name||'Guest student'}</b><small>{db.user?(db.user.verified?'University Google account':'Demo account'):'Sign in to get started'}</small></span><ChevronDown size={17}/></button></div>
    </aside>
    <div className="main">
      {(cloud.loading||cloud.error)&&<div className="cloud-sync-status" role="status">{cloud.error||'Loading your rides and messages…'}{cloud.error&&<button onClick={cloud.refresh}>Retry</button>}</div>}
      <header className="topbar"><button aria-label="Open menu" className="mobile-menu iconbtn" onClick={()=>setMenu(!menu)}><Menu size={23}/></button>{page!=='discover'&&<span className="breadcrumb">BRACU <span>/</span> {page==='share'?'Offer a ride':page==='myrides'?'My rides':page==='messages'?'Messages':page==='login'?'Sign in':'Profile'}</span>}<div className="header-right"><div className="live-dot"/> <span>Dhaka, Bangladesh</span><button className="iconbtn" onClick={()=>toPage('myrides')} title="My requests" aria-label="My requests"><Bell size={19}/></button><button className="header-logo-button" aria-label={db.user?'Open profile':'Sign in'} onClick={()=>toPage(db.user?'profile':'login')}><img src="/brand/cholocampus-logo.png" width="44" height="44" alt="choloCampus"/></button></div></header>
      {menu&&<div className="mobile-dropdown"><button onClick={()=>toPage('discover')}>Find a ride</button><button onClick={()=>toPage('share')}>Offer a ride</button><button onClick={()=>toPage('myrides')}>My rides</button><button onClick={()=>toPage('messages')}>Messages</button><button onClick={()=>toPage('profile')}>Profile</button><div className="menu-credits"><a href="https://nexasity.pages.dev/" target="_blank" rel="noreferrer">A product of Nexasity</a><a href="https://www.flaticon.com/uicons" target="_blank" rel="noreferrer">Uicons by Flaticon</a></div></div>}
      {page==='discover'&&<main className="content discover">
        <div className="explore-layout"><section className="map-search-control" aria-label="Find a ride" onKeyDown={e=>{if(e.key==='Escape'){setShowRides(false);setFilterOpen(false);e.target.blur()}}}>
          <form className="map-search-bar" onSubmit={e=>{e.preventDefault();setShowRides(true)}}>
            <Search size={21}/><input aria-label="Search pickup or destination" placeholder="Where to?" value={query} onFocus={()=>setShowRides(true)} onChange={e=>{setQuery(e.target.value);setSearchPlace(null);setShowRides(true)}}/>
            {query&&<button type="button" className="search-tool" aria-label="Clear search" onClick={()=>{setQuery('');setSearchPlace(null);setShowRides(false)}}><X size={16}/></button>}
            <button type="button" className="search-tool" aria-label="Choose destination on map" onClick={()=>setDestinationOpen(true)}><MapPin size={20}/></button>
            <button type="button" className={'search-tool '+(filterOpen?'active':'')} aria-label="Ride filters" aria-expanded={filterOpen} onClick={()=>{setFilterOpen(!filterOpen);setShowRides(true)}}><SlidersHorizontal size={20}/></button>
          </form>
          {showRides&&<div className="search-drawer" role="region" aria-label="Ride search results">
            <div className="search-drawer-heading"><div><h1>Find a ride</h1><small>{readable(date)}</small></div><button className="search-tool" aria-label="Close search results" onClick={()=>{setShowRides(false);setFilterOpen(false)}}><X size={18}/></button></div>
            <PlaceSearchResults query={query} locations={LOCATIONS} onSelect={place=>{setSearchPlace(place);setFocus([...place.coords]);setQuery(place.name);setShowRides(false);setFilterOpen(false)}}/>
            <button className="destination-shortcut" onClick={()=>setDestinationOpen(true)}><MapPin size={18}/><span>{preference?.name||'Set preferred destination'}</span><ChevronDown size={16}/></button>
            {preference&&<label className="destination-nearby"><input type="checkbox" checked={nearbyOnly} onChange={e=>setNearbyOnly(e.target.checked)}/>Show rides within 3 km</label>}
            <div className="tabs"><button className={tab==='all'?'picked':''} onClick={()=>setTab('all')}>All rides</button><button className={tab==='to'?'picked':''} onClick={()=>setTab('to')}>To campus</button><button className={tab==='from'?'picked':''} onClick={()=>setTab('from')}>From campus</button></div>
            {filterOpen&&<label className="vehicle-filter">Vehicle<select value={vehicleFilter} onChange={e=>setVehicleFilter(e.target.value)}><option value="all">All vehicles</option><option>Car</option><option>Bike</option></select></label>}
            <p className="ride-result-count">{visible.length} available {visible.length===1?'ride':'rides'}</p>
            {<div className="ride-list">{visible.length===0&&<div className="empty-state"><CarFront size={34}/><b>{cloud.loading?'Loading rides…':cloud.error?'Rides could not be loaded':'No matching future rides'}</b><p>{cloud.error?'Check your connection and retry.':'Be the first to offer a ride for this board.'}</p></div>}{visible.map(ride=><button key={ride.id} className={'ride-card '+(selected===ride.id?'selected':'')} onClick={()=>{setSelected(ride.id);setFocus(ridePoint(ride))}}><div className="ride-card-top"><div className={'direction '+ride.direction}><ArrowUpRight size={14}/>{label(ride)}</div><span className="ride-time"><Clock3 size={14}/>{timeLabel(ride.time)}</span></div><div className="route"><div className="route-line"><span/><i/><span/></div><div><b>{ride.from}</b><span>{ride.to}</span></div></div><div className="ride-footer"><span className="rider"><span className="mini-avatar">{ride.initials}</span> {ride.name}</span><span className="seats"><Users size={15}/>{ride.seats} {ride.seats===1?'seat':'seats'} · {ride.vehicle}</span></div><div className="ride-card-fare">{fareLabel(ride.fare)}</div></button>)}</div>}
          </div>}
        </section><section className="map-card"><MapContainer center={[23.797,90.408]} zoom={12} zoomAnimation={false} fadeAnimation={false} zoomControl={false} className="map"><RideMapTiles/><MapLocateControl/><MapDismiss onDismiss={()=>{setShowRides(false);setFilterOpen(false);setMenu(false);if(document.activeElement?.tagName==='INPUT')document.activeElement.blur()}}/><MapRecenter point={focus}/>{searchPlace&&<CircleMarker center={searchPlace.coords} radius={10} pathOptions={{color:'#fff',weight:3,fillColor:'#1677ff',fillOpacity:1}}><Tooltip permanent direction="top">{searchPlace.name}</Tooltip></CircleMarker>}{preference&&<CircleMarker center={preference.coords} radius={9} pathOptions={{color:'#d5f531',weight:3,fillColor:'#111',fillOpacity:1}}><Popup>{preference.name}</Popup></CircleMarker>}<CircleMarker center={CAMPUS} radius={10} pathOptions={{color:'#fff',weight:3,fillColor:'#d5f531',fillOpacity:1}}><Popup>BRAC University · Merul Badda</Popup></CircleMarker>{visible.filter(ridePoint).map(r=><CircleMarker key={r.id} center={ridePoint(r)} radius={selected===r.id?16:12} pathOptions={{color:'#fff',weight:3,fillColor:r.direction==='to'?'#ef685a':'#1eab85',fillOpacity:1}} eventHandlers={{click:()=>setSelected(r.id)}}><Tooltip permanent direction="top" offset={[0,-12]} className="ride-marker-label"><b>{r.time}</b><span>{r.vehicle==='Bike'?'Bike':'Car'} · A.S. {r.seats}</span></Tooltip><Popup><b>{r.from}</b><br/>{label(r)} · {timeLabel(r.time)}<br/>{r.seats} seats available</Popup></CircleMarker>)}</MapContainer></section></div>
        {currentRide&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="ride-modal" onClick={e=>e.stopPropagation()}><div className="modal-top"><span className={'direction '+currentRide.direction}>{label(currentRide)}</span><button className="iconbtn" onClick={()=>setSelected(null)}><X size={20}/></button></div><h2>Ride details</h2><p className="muted">{readable(currentRide.date)} · {timeLabel(currentRide.time)}</p><div className="detail-route"><div><MapPin size={18}/><span><small>PICKUP</small><b>{currentRide.from}</b></span></div><div><Navigation size={18}/><span><small>DESTINATION</small><b>{currentRide.to}</b></span></div></div><div className="detail-grid"><span><CarFront size={19}/>{currentRide.vehicle}</span><span><Users size={19}/>{currentRide.seats} open seats</span></div><div className="owner"><div className="avatar">{currentRide.initials}</div><div><b>{currentRide.name}</b><small>Ride owner · BRACU member</small></div></div><p className="ride-note">{currentRide.note||'Coordinate pickup and fare in chat.'}</p><div className="fare">Fare <b>{fareLabel(currentRide.fare)}</b></div><button className="primary-btn full" onClick={()=>requestRide(currentRide)} disabled={cloud.busy||bookingConflict||currentRide.ownerId===db.user?.id}>{currentRide.ownerId===db.user?.id?'Your ride':bookingConflict?'Already booked in this direction':requestFor(currentRide)?'Open conversation':'Request seat & chat'} <ArrowRight size={18}/></button><small className="demo-warning">Seat requests and messages are shared securely with the ride owner.</small></div></div>}
      </main>}
      {page==='share'&&<main className="content narrow"><div className="page-heading"><div><div className="eyebrow">MAKE SOMEONE'S COMMUTE EASIER</div><h1>Offer <em>a ride.</em></h1><p>Have an empty seat? Share your journey with the BRACU community.</p></div></div><div className="cycle"><CalendarDays/><div><b>Posting for {readable(date)}</b><span>Rides can be posted from 9 PM the previous night until 8:59 PM on the ride day, as long as departure is in the future.</span></div></div><form className="form-card" onSubmit={submitRide}><h2>Journey direction</h2><div className="direction-picker"><button type="button" className={form.direction==='to'?'chosen':''} onClick={()=>applyDirection('to')}><span className="circle red"><ArrowUpRight size={20}/></span><b>Going to campus</b><small>Heading to BRAC University</small></button><button type="button" className={form.direction==='from'?'chosen':''} onClick={()=>applyDirection('from')}><span className="circle green"><ArrowUpRight size={20}/></span><b>Returning from campus</b><small>Leaving BRAC University</small></button></div><div className="form-grid"><label>Pickup location<button type="button" className="route-location-button" aria-label="Choose pickup location" disabled={form.direction==='from'} onClick={()=>setRideLocationEndpoint('from')}><MapPin size={18}/><span>{form.from}</span>{form.direction!=='from'&&<ChevronDown size={16}/>}</button>{form.direction==='from'&&<small className="fixed-campus-note">Fixed pickup: BRAC University</small>}</label><label>Destination<button type="button" className="route-location-button" aria-label="Choose destination location" disabled={form.direction==='to'} onClick={()=>setRideLocationEndpoint('to')}><MapPin size={18}/><span>{form.to}</span>{form.direction!=='to'&&<ChevronDown size={16}/>}</button>{form.direction==='to'&&<small className="fixed-campus-note">Fixed destination: BRAC University</small>}</label><label>Departure time<input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} required/></label><label>Vehicle<select value={form.vehicle} onChange={e=>setForm({...form,vehicle:e.target.value,seats:e.target.value==='Bike'?'1':form.seats})}><option>Car</option><option>Bike</option></select></label><label>Available seats<select value={form.seats} onChange={e=>setForm({...form,seats:e.target.value})}>{Array.from({length:form.vehicle==='Bike'?1:6},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label><label>Fare per seat (৳)<input type="number" min="0" max="99999999.99" step="0.01" inputMode="decimal" value={form.fare} onChange={e=>setForm({...form,fare:e.target.value})} placeholder="Optional, e.g. 80"/><small>Leave blank to discuss. Enter 0 for a free ride.</small></label><label className="wide">Notes for passengers<textarea rows="4" maxLength="240" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Landmark, pickup flexibility, or other useful details..."/></label></div><div className="form-actions">{!activeOffer&&<span>Fare is per seat in Bangladeshi taka.</span>}<button className="primary-btn" type="submit" disabled={cloud.busy||cloud.loading||Boolean(activeOffer)}>{cloud.busy?'Publishing…':'Publish ride'} <ArrowRight size={18}/></button></div></form></main>}
      {page==='login'&&<LoginPanel auth={auth}/>}
      {page==='myrides'&&<main className="content narrow"><div className="page-heading"><div><div className="eyebrow">YOUR JOURNEYS</div><h1>My <em>rides.</em></h1><p>Manage your offers, requests, and seat confirmations.</p></div></div>{!db.user?<div className="empty-box"><Users size={32}/><h2>Sign in to see your rides</h2><button className="primary-btn" onClick={()=>toPage('login')}>Sign in</button></div>:<><h2 className="section-title">Rides you offered</h2>{db.rides.filter(r=>r.ownerId===db.user.id).length===0?<div className="empty-box smallbox">No rides offered yet.</div>:db.rides.filter(r=>r.ownerId===db.user.id).map(r=><div className="record" key={r.id}><div><b>{r.from} → {r.to}</b><small>{readable(r.date)} · {timeLabel(r.time)} · {r.seats} seats left · {fareLabel(r.fare)}</small></div><button onClick={()=>cancelRide(r)} className="light-btn" disabled={r.cancelled||cloud.busy}>{r.cancelled?'Cancelled':'Cancel offer'}</button></div>)}<h2 className="section-title">Seat requests</h2>{requests.length===0?<div className="empty-box smallbox">No seat requests yet. Request a ride to start a conversation.</div>:requests.map(r=><div className="record" key={r.id}><div><b>{r.rideSnapshot.from} → {r.rideSnapshot.to}</b><small>{r.ownerId===db.user.id?`Requested by ${r.requesterName}`:`Hosted by ${r.ownerName}`} · <span className={'status '+r.status}>{r.status}</span></small></div><button className="light-btn" onClick={()=>{setChatId(r.id);toPage('messages')}}>Open chat <ArrowRight size={15}/></button></div>)}</>}</main>}
      {page==='messages'&&<main className="content message-page"><div className="page-heading"><div><div className="eyebrow">PLAN THE DETAILS</div><h1>Your <em>messages.</em></h1><p>Agree on fare, meeting point, and ride details.</p></div></div><div className="messaging"><div className="conversations"><h3>Conversations</h3>{requests.length===0?<p className="convo-empty">No conversations yet. Request a seat to start chatting.</p>:requests.map(r=><button key={r.id} className={'convo '+(chatId===r.id?'active':'')} onClick={()=>setChatId(r.id)}><div className="avatar">{(r.ownerId===db.user?.id?r.requesterName:r.ownerName)[0]}</div><div><b>{r.ownerId===db.user?.id?r.requesterName:r.ownerName}</b><small>{r.rideSnapshot.from} → {r.rideSnapshot.to}</small></div></button>)}</div><div className="chat-panel">{!activeChat?<div className="chat-placeholder"><MessageCircle size={38}/><b>Select a conversation</b><span>Discuss pickup locations and fares here.</span></div>:<><div className="chat-header"><b>{activeChat.ownerId===db.user?.id?activeChat.requesterName:activeChat.ownerName}</b><span>{activeChat.rideSnapshot.from} → {activeChat.rideSnapshot.to}</span><small>{fareLabel(activeChat.rideSnapshot.fare)} · Request: <span className={'status '+activeChat.status}>{activeChat.status}</span></small></div><div className="chat-history">{(db.chats[chatId]||[]).map((m,i)=><div className={'bubble '+(m.from==='system'?'system':m.from===db.user?.id?'mine':'theirs')} key={i}>{m.text}</div>)}</div>{activeChat.ownerId===db.user?.id&&activeChat.status==='pending'&&<div className="request-actions"><button onClick={()=>updateRequest(activeChat,'accepted')} className="accept" disabled={cloud.busy}><Check size={16}/> Accept request</button><button onClick={()=>updateRequest(activeChat,'declined')} className="decline" disabled={cloud.busy}><X size={16}/> Decline</button></div>}<form className="chat-compose" onSubmit={sendChat}><input placeholder="Write a message..." value={draft} onChange={e=>setDraft(e.target.value)} maxLength="500"/><button className="primary-btn" aria-label="Send message" disabled={cloud.busy||['cancelled','declined'].includes(activeChat.status)}><Send size={18}/></button></form></>}</div></div><p className="demo-warning">Messages are saved securely and refresh automatically. Only you and the other participant can read this conversation.</p></main>}
      {page==='profile'&&<main className="content narrow"><div className="page-heading"><div><div className="eyebrow">YOUR ACCOUNT</div><h1>University <em>profile.</em></h1></div></div>{db.user?<div className="form-card profile-card"><div className="avatar xl">{db.user.name[0].toUpperCase()}</div><h2>{db.user.name}</h2><p>{db.user.email}</p><span className="fake-badge">{db.user.verified?'University Google account':'Demo profile · Not verified'}</span><button className="light-btn" onClick={logout}><LogOut size={16}/> Sign out</button></div>:<div className="empty-box"><p>You're browsing as a guest.</p><button className="primary-btn" onClick={()=>toPage('login')}>Sign in</button></div>}<div className="support"><h2>Help & support</h2><p>Your rides, seat requests, messages, and preferred destination are saved to your university account. Contact Nexasity for help.</p></div></main>}
      <footer className="icon-credit"><p className="product-credit">A product of <a href="https://nexasity.pages.dev/" target="_blank" rel="noopener noreferrer">Nexasity</a></p>Uicons by <a href="https://www.flaticon.com/uicons" target="_blank" rel="noreferrer">Flaticon</a></footer>
    </div>{rideLocationEndpoint&&<RideLocationPicker key={rideLocationEndpoint} endpoint={rideLocationEndpoint} initial={{name:form[rideLocationEndpoint],coords:routePoint(form,rideLocationEndpoint,LOCATIONS)}} locations={LOCATIONS} onClose={()=>setRideLocationEndpoint(null)} onConfirm={place=>{setForm(previous=>({...previous,[rideLocationEndpoint]:place.name,[rideLocationEndpoint==='from'?'fromCoords':'toCoords']:place.coords}));setRideLocationEndpoint(null);}}/>}{destinationOpen&&<DestinationPicker key={db.user?.id||'guest'} locations={LOCATIONS} preference={preference} onClose={()=>setDestinationOpen(false)} onSave={savePreferredDestination}/>}<nav className="floating-nav" aria-label="Main navigation">{[{id:'discover',title:'Find ride',Icon:Compass},{id:'share',title:'Share ride',Icon:Plus},{id:'myrides',title:'My rides',Icon:CalendarDays},{id:'messages',title:'Messages',Icon:MessageCircle},{id:'profile',title:'Profile',Icon:Users}].map(({id,title,Icon})=><button key={id} aria-label={title} aria-current={page===id?'page':undefined} className={page===id?'active':''} onClick={()=>toPage(id)}><Icon size={21}/><span>{title}</span></button>)}</nav>{toast&&<div className="toast"><Check size={17}/>{toast}</div>}
  </div>;
}
createRoot(document.getElementById('root')).render(<SystemThemeProvider><App/></SystemThemeProvider>);
