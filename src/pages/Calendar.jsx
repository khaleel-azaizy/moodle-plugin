import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useState } from 'react';
import '@fortawesome/fontawesome-free/css/all.min.css';
const ItemTypes = {
  EVENT: 'event',
};

function Calendar({ year, month, events, addNewEvent, deleteEvent, handleEventDrop ,editEvent}) {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const numDaysInMonth = lastDayOfMonth.getDate();
  const startDay = firstDayOfMonth.getDay();
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const result = [];
 

  for (let i = 0; i < startDay; i++) {
    const dayNum = prevMonthLastDay - (startDay - 1) + i;
    result.push({
      date: dayNum,
      inCurrentMonth: false,
      month: month - 1 < 0 ? 11 : month - 1,
      year: month - 1 < 0 ? year - 1 : year,
      events: [],
    });
  }

  for (let i = 1; i <= numDaysInMonth; i++) {
    if (i === new Date().getDate() && year === new Date().getFullYear() && month === new Date().getMonth()) {
      result.push({
        date: i,
        inCurrentMonth: true,
        isToday: true,
        month: month,
        year: year,
        events: [],
      });
      continue;
    }
    result.push({
      date: i,
      inCurrentMonth: true,
      month: month,
      year: year,
      events: [],
    });
  }

  while (result.length < 42) {
    result.push({
      date: result.length - (numDaysInMonth + startDay) + 1,
      inCurrentMonth: false,
      month: month + 1 > 11 ? 0 : month + 1,
      year: month + 1 > 11 ? year + 1 : year,
      events: [],
    });
  }

  events.forEach((event) => {
    const eventDate = new Date(event.date);
    const eventDay = eventDate.getDate();
    const eventMonth = eventDate.getMonth();
    const eventYear = eventDate.getFullYear();
    result.forEach((day) => {
      if (day.date === eventDay && day.month === eventMonth && day.year === eventYear) {
        day.events.push(event);
      }
    });
  });
  
  return (
    <div className="calendar">
      <div  className="my-calendar">
    <span className="days">Sun</span>
    <span className="days">Mon</span>
    <span className="days">Tue</span>
    <span className="days">Wed</span>
    <span className="days">Thu</span>
    <span className="days">Fri</span>
    <span className="days">Sat</span>
 
    </div>
    <div className="calendar-grid">
      {result.map((day, index) => (
        <DayCell key={index} day={day} addNewEvent={addNewEvent} deleteEvent={deleteEvent} handleEventDrop={handleEventDrop} editEvent={editEvent}/>
      ))}
    </div>
    </div>
   
  );
}

function DayCell({ day, addNewEvent, deleteEvent, handleEventDrop ,editEvent}) {
  

  const [, drop] = useDrop({
    accept: ItemTypes.EVENT,
    drop: (item, monitor) => {
      handleEventDrop(item.id, day.date, day.month, day.year,item.title);
    },
  });

  return (
    <div ref={drop} className="calendar-cell" onClick={() => addNewEvent(day)}>
      
      {day.inCurrentMonth ? (
        <div className="day-number">
          {day.isToday ? (
            <div className="today-number">{day.date}</div>
          ) : (
            <div className="day-number">{day.date}</div>
          )}
        </div>
      ) : (
        <div className="day-number-not-in-the-month">{day.date}</div>
      )}
      <div className="user-events">
       
        {day.events.map((event, eventIndex) => (
          <Event key={eventIndex} event={event} deleteEvent={deleteEvent}  startTime={event.startTime} endTime={event.endTime} editEvent={editEvent} />
        ))}
        {day.events.length > 0 && <div className="day-with-event"></div>}
      </div>
    </div>
  );
}

function Event({ event, deleteEvent ,startTime,endTime,editEvent}) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.EVENT,
    item: { id: event.id, date: event.date },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  const [deletemodal, setDeleteModal] = useState(false);
  const handleClick = (e) => {
    e.stopPropagation();
    setDeleteModal(!deletemodal);
  };
 
  return (
    <div
      ref={drag}
      className="event-item"
      style={{ opacity: isDragging ? 0.5 : 1 }}
      onClick={handleClick}
    >
       <h4>{event.title}</h4>
       {(startTime || endTime) && <p className="event-time">
        {startTime} - {endTime}
        </p> }
        {deletemodal && 
          <button className="edit-button" onClick={(e) => {
          e.stopPropagation();
          editEvent(event.id);
          }} >
           <i className="fa-solid fa-edit"></i>
          </button>}
        {deletemodal && 
          <button className="delete-button" onClick={(e) => {
          e.stopPropagation();
          deleteEvent(event.id);
          }} >
           <i className="fa-solid fa-trash"></i>
          </button>}
     
    </div>
  );
}

export default Calendar;
export { Event };