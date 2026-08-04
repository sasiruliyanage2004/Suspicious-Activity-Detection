import React, { useState, useEffect } from 'react'
import CameraTile from './CameraTile.jsx'

export default function CameraGrid({ cameras, onExpand, onRename, onRemove }) {
  const [personCounts, setPersonCounts] = useState({})

  useEffect(() => {
    const interval = setInterval(() => {
      fetch('http://127.0.0.1:8002/api/person_counts')
        .then(res => res.json())
        .then(data => setPersonCounts(data))
        .catch(err => console.error("Failed to fetch person counts", err))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {cameras.map((camera, i) => {
        // Find if this camera has active persons
        let cId = ""
        if (camera.streamUrl.includes("/1")) cId = "webcam_1"
        else if (camera.streamUrl.includes("/2")) cId = "webcam_2"
        const count = personCounts[cId] || 0;

        return (
          <CameraTile 
            key={camera.id} 
            camera={camera} 
            index={i} 
            personCount={count}
            onExpand={onExpand} 
            onRename={onRename} 
            onRemove={onRemove} 
          />
        )
      })}
    </div>
  )
}
