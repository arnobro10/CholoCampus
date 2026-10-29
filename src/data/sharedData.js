export function rideFromRow(row) {
  return { id:row.id, ownerId:row.owner_id, name:row.owner_name,
    initials:row.owner_name.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase(),
    direction:row.direction, from:row.pickup, to:row.destination, date:row.ride_date,
    fromCoords:row.pickup_lat != null && row.pickup_lng != null ? [row.pickup_lat,row.pickup_lng] : null,
    toCoords:row.destination_lat != null && row.destination_lng != null ? [row.destination_lat,row.destination_lng] : null,
    time:row.departure_time.slice(0,5), vehicle:row.vehicle, seats:row.seats,
    note:row.note, fare:row.fare == null ? null : Number(row.fare), cancelled:row.cancelled };
}

export function stateFromRows(rides, requests, messages, destinations) {
  const mapped = rides.map(rideFromRow);
  const byId = new Map(mapped.map(ride=>[ride.id,ride]));
  return { rides:mapped, requests:requests.map(row=>({id:row.id, rideId:row.ride_id,
    requesterId:row.requester_id, requesterName:row.requester_name,
    ownerId:row.owner_id, ownerName:row.owner_name, status:row.status,
    rideSnapshot:byId.get(row.ride_id) })).filter(row=>row.rideSnapshot),
    chats:messages.reduce((all,row)=>{
      (all[row.request_id] ||= []).push({ id:row.id, from:row.sender_id || 'system', text:row.body, at:Date.parse(row.created_at) });
      return all;
    },{}),
    destinations:Object.fromEntries(destinations.map(row=>[row.user_id,{
      name:row.name, coords:[row.lat,row.lng], changeDate:row.change_date, changes:row.changes
    }])) };
}

async function readAll(client, table) {
  const rows=[];
  // Paginate rather than silently losing history at the API's row limit.
  for(let start=0;;start+=1000) {
    let query=client.from(table).select('*');
    query=table==='messages' ? query.order('created_at').order('id') : query.order(table==='preferred_destinations'?'user_id':'id');
    const {data,error}=await query.range(start,start+999);
    if(error) throw new Error(error.message || 'Could not load shared data.');
    rows.push(...data);
    if(data.length<1000) return rows;
  }
}

export async function fetchSharedData(client) {
  const rows=await Promise.all(['rides','ride_requests','messages','preferred_destinations'].map(table=>readAll(client,table)));
  return stateFromRows(...rows);
}

export async function callMutation(client, name, args) {
  const { data,error }=await client.rpc(name,args);
  if(error) throw new Error(error.message || 'Could not save. Please try again.');
  return data;
}
