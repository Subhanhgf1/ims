import { forwardRef } from "react"

const Alert = forwardRef(({ className = "", variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-blue-50 border border-blue-200 text-blue-800",
    destructive: "bg-red-50 border border-red-200 text-red-800",
  }

  return (
    <div
      ref={ref}
      role="alert"
      className={`rounded-lg p-4 ${variants[variant] || variants.default} ${className}`}
      {...props}
    />
  )
})
Alert.displayName = "Alert"

const AlertDescription = forwardRef(({ className = "", ...props }, ref) => {
  return <div ref={ref} className={`text-sm ${className}`} {...props} />
})
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertDescription }
