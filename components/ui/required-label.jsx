import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function RequiredLabel({ children, required = false, className, ...props }) {
  return (
    <Label className={cn("block text-sm font-medium", className)} {...props}>
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
  )
}
