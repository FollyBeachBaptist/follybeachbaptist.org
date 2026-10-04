(function (root) {
  'use strict';
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  function parseDate(text) {
    let match = String(text).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    let y, m, d;
    if (match) { y=+match[1]; m=+match[2]-1; d=+match[3]; }
    else {
      match=String(text).trim().match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
      if (!match) return null;
      m=monthNames.findIndex(n=>n.toLowerCase()===match[1].toLowerCase()); d=+match[2]; y=+match[3];
    }
    if (m<0 || m>11 || y<1900 || y>2200) return null;
    const date=new Date(Date.UTC(y,m,d));
    return date.getUTCFullYear()===y && date.getUTCMonth()===m && date.getUTCDate()===d ? date : null;
  }
  function parseEntry(text) {
    const fields={};
    const pattern=/(?:^|\s)(Event|Date|Time|End date|Repeats|Through|Status):\s*([\s\S]*?)(?=\s+(?:Event|Date|Time|End date|Repeats|Through|Status):|$)/gi;
    for (const match of String(text).matchAll(pattern)) fields[match[1].toLowerCase()]=match[2].trim();
    if (!fields.event) return null;
    return {title:fields.event,date:parseDate(fields.date),time:fields.time||'Time: Needs confirmation',end:fields['end date'] ? parseDate(fields['end date']):null,repeat:fields.repeats||'',through:fields.through ? parseDate(fields.through):null,status:fields.status||'',invalidEnd:!!fields['end date']&&!parseDate(fields['end date'])};
  }
  function occurrences(event) {
    if (!event.date || event.invalidEnd || (event.end && event.end<event.date)) return [];
    const repeat=event.repeat.match(/^Every (Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/i);
    if (event.repeat && (!repeat || !event.through || event.through<event.date || weekdays[event.date.getUTCDay()].toLowerCase()!==repeat[1].toLowerCase())) return [];
    const last=event.repeat ? event.through : event.end||event.date;
    const step=event.repeat ? 7 : 1;
    if ((last-event.date)/86400000>3660) return [];
    const days=[];
    for (let n=event.date.getTime();n<=last.getTime();n+=step*86400000) days.push(new Date(n));
    return days;
  }
  const api={parseDate,parseEntry,occurrences};
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  root.ChurchCalendar=api;
  if (typeof document==='undefined') return;
  const container=document.getElementById('monthly-calendar');
  if (!container) return;
  const grid=document.getElementById('calendar-days'), selector=document.getElementById('calendar-month'), notice=document.getElementById('calendar-notice');
  const currentParts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'numeric'}).formatToParts(new Date());
  const currentYear=+currentParts.find(p=>p.type==='year').value,currentMonth=+currentParts.find(p=>p.type==='month').value-1;
  let periods=[],selected=0,items=[];
  function draw() {
    selector.value=String(selected);
    document.getElementById('calendar-prev').disabled=selected===0;
    document.getElementById('calendar-next').disabled=selected===periods.length-1;
    const [year,month]=periods[selected];
    grid.replaceChildren();
    const first=new Date(Date.UTC(year,month,1)).getUTCDay(),count=new Date(Date.UTC(year,month+1,0)).getUTCDate();
    const heading=monthNames[month]+' '+year;
    document.getElementById('calendar-heading').textContent=heading;
    for (let cell=0;cell<Math.ceil((first+count)/7)*7;cell++) {
      const day=cell-first+1,box=document.createElement('div');box.className='mc-day';
      if (day<1||day>count) box.classList.add('mc-empty');
      else {
        const number=document.createElement('time');number.className='mc-date';number.textContent=day;
        const key=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        number.dateTime=key;box.append(number);
        const daily=items.filter(item=>item.key===key);
        daily.forEach(item=>{
          const line=document.createElement('div');line.className='mc-event';
          const canceled=/^cancelled$|^canceled$|^not meeting$/i.test(item.event.status);
          if(canceled) line.classList.add('mc-canceled');
          line.textContent=[item.event.time,item.event.title].filter(Boolean).join(' — ')+(canceled?' (Canceled)':'');
          box.append(line);
        });
      }
      grid.append(box);
    }
  }
  selector.addEventListener('change',()=>{selected=+selector.value;draw()});
  document.getElementById('calendar-prev').addEventListener('click',()=>{if(selected>0){selected--;draw()}});
  document.getElementById('calendar-next').addEventListener('click',()=>{if(selected<periods.length-1){selected++;draw()}});
  document.getElementById('calendar-print').addEventListener('click',()=>window.print());
  async function load() {
    try {
      const response=await fetch(container.dataset.source,{cache:'no-store'});
      if(!response.ok) throw new Error('Calendar request failed');
      const data=await response.json();
      if(!Array.isArray(data)) throw new Error('Invalid calendar data');
      const events=data.map(e=>({title:e.title,date:parseDate(e.date),time:e.time||'',end:e.end_date?parseDate(e.end_date):null,repeat:e.repeats||'',through:e.through?parseDate(e.through):null,status:e.status||'',invalidEnd:!!e.end_date&&!parseDate(e.end_date)}));
      let incomplete=0;
      events.forEach(event=>{const dates=occurrences(event);if(!dates.length)incomplete++;dates.forEach(date=>items.push({key:date.toISOString().slice(0,10),event}))});
      const years=items.map(item=>+item.key.slice(0,4));
      const start=Math.min(currentYear,...years),end=Math.max(currentYear+1,2027,...years);
      for(let y=start;y<=end;y++) for(let m=0;m<12;m++)periods.push([y,m]);
      periods.forEach(([y,m],i)=>{const option=document.createElement('option');option.value=i;option.textContent=monthNames[m]+' '+y;selector.append(option)});
      selected=periods.findIndex(([y,m])=>y===currentYear&&m===currentMonth);
      notice.textContent= incomplete ? 'Some events need date or recurrence confirmation.' : '';
      document.getElementById('calendar-controls').hidden=false;draw();
    } catch(error) {notice.textContent='The monthly calendar could not load. Please refresh or try again later.';}
  }
  load();
})(typeof globalThis!=='undefined'?globalThis:this);
