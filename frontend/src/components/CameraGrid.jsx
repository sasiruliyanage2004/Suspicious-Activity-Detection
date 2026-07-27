import React from 'react'
import CameraTile from './CameraTile.jsx'

export default function CameraGrid({ cameras, onExpand, onRename }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {cameras.map((camera, i) => (
        <CameraTile key={camera.id} camera={camera} index={i} onExpand={onExpand} onRename={onRename} />
      ))}
    </div>
  )
}
