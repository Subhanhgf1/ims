import { forwardRef } from "react"

const Label = forwardRef(({ className = "", ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={`text-sm font-medium text-gray-700 ${className}`}
      {...props}
    />
  )
})

Label.displayName = "Label"

export { Label }
