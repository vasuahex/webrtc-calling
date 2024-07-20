import React from 'react'
import TooltipButton from '../ToolTip/Tooltip'

const ToolTip = () => {
    return (
        <>
            <div className="flex justify-center items-center w-full gap-10 h-screen border p-2 bg-gray-400" >
                <TooltipButton text="Left button" tooltipText="Tooltip on left" position="left" />
                <TooltipButton text="Bottom" tooltipText="Tooltip on bottom" position="bottom" />
                <TooltipButton text="Top" tooltipText="Tooltip on top" position="top" />
                <TooltipButton text="Right button" tooltipText="Tooltip on right" position="right" />
            </div>
        </>
    )
}

export default ToolTip