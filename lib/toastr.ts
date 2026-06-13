"use client"

import { toast } from "@/hooks/use-toast"

interface ToastrOptions {
  title?: string
  description?: string
  duration?: number
}

class Toastr {
  /**
   * Show a success toast
   */
  success(message: string, options?: ToastrOptions) {
    return toast({
      title: options?.title || "Success",
      description: message,
      variant: "default",
      duration: options?.duration || 5000,
      className: "border-green-200 bg-green-50 text-green-800",
    })
  }

  /**
   * Show an error toast
   */
  error(message: string, options?: ToastrOptions) {
    return toast({
      title: options?.title || "Error",
      description: message,
      variant: "destructive",
      duration: options?.duration || 8000,
    })
  }

  /**
   * Show a warning toast
   */
  warning(message: string, options?: ToastrOptions) {
    return toast({
      title: options?.title || "Warning",
      description: message,
      variant: "default",
      duration: options?.duration || 6000,
      className: "border-yellow-200 bg-yellow-50 text-yellow-800",
    })
  }

  /**
   * Show an info toast
   */
  info(message: string, options?: ToastrOptions) {
    return toast({
      title: options?.title || "Information",
      description: message,
      variant: "default",
      duration: options?.duration || 5000,
      className: "border-blue-200 bg-blue-50 text-blue-800",
    })
  }

  /**
   * Show a loading toast
   */
  loading(message: string, options?: ToastrOptions) {
    return toast({
      title: options?.title || "Loading",
      description: message,
      variant: "default",
      duration: options?.duration || 0, // Don't auto-dismiss loading toasts
      className: "border-gray-200 bg-gray-50 text-gray-800",
    })
  }

  /**
   * Show a promise toast that updates based on promise state
   */
  async promise<T>(
    promise: Promise<T>,
    {
      loading: loadingMessage = "Loading...",
      success: successMessage = "Success!",
      error: errorMessage = "Something went wrong",
    }: {
      loading?: string
      success?: string | ((data: T) => string)
      error?: string | ((error: any) => string)
    }
  ): Promise<T> {
    const loadingToast = this.loading(loadingMessage)

    try {
      const result = await promise
      
      // Dismiss loading toast
      if (loadingToast && typeof loadingToast.dismiss === 'function') {
        loadingToast.dismiss()
      }
      
      // Show success toast
      const successMsg = typeof successMessage === "function" 
        ? successMessage(result) 
        : successMessage
      this.success(successMsg)
      
      return result
    } catch (error) {
      // Dismiss loading toast
      if (loadingToast && typeof loadingToast.dismiss === 'function') {
        loadingToast.dismiss()
      }
      
      // Show error toast
      const errorMsg = typeof errorMessage === "function" 
        ? errorMessage(error) 
        : errorMessage
      this.error(errorMsg)
      
      throw error
    }
  }

  /**
   * Show a custom toast with full control
   */
  custom(options: {
    title?: string
    description: string
    variant?: "default" | "destructive"
    duration?: number
    className?: string
  }) {
    return toast({
      title: options.title,
      description: options.description,
      variant: options.variant || "default",
      duration: options.duration || 5000,
      className: options.className,
    })
  }
}

// Export singleton instance
export const toastr = new Toastr()

// Export individual methods for convenience
export const {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  promise: showPromise,
  custom: showCustom,
} = toastr

// Default export
export default toastr
