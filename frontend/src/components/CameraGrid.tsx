import React, { useState, useEffect } from 'react'
import CameraTile from './CameraTile'
import { safeFetch, AI_URL } from '../utils/api'

export default function CameraGrid({ cameras, onExpand, onRename, onRemove }) {
  const [personCounts, setPersonCounts] = useState({})

  useEffect(() => {
    let failureCount = 0
    let timerId = null
    let isMounted = true

    const pollPersonCounts = async () => {
      try {
        const res = await safeFetch(`${AI_URL}/api/person_counts`, {}, 1500)
        if (res.ok) {
          const data = await res.json()
          if (isMounted) {
            setPersonCounts(data)
            failureCount = 0
          }
        } else {
          failureCount++
        }
      } catch (err) {
        failureCount++
      }

      if (isMounted) {
        // If server is unreachable or failing, back off to 20s instead of hammering every 1s
        const nextDelay = failureCount >= 2 ? 20000 : 3000
        timerId = setTimeout(pollPersonCounts, nextDelay)
      }
    }

    pollPersonCounts()

    return () => {
      isMounted = false
      if (timerId) clearTimeout(timerId)
    }
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
