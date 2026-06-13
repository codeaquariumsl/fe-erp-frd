/**
 * SMS utility for sending messages via internal API
 */

interface SMSOrderData {
  orderNumber: string
  customerName: string
  contactNumber: string
  deliveryDate: string
  totalAmount: number
  itemCount: number
}

/**
 * Send sales order confirmation SMS via internal API
 */
export async function sendSalesOrderSMS(orderData: SMSOrderData): Promise<boolean> {
  try {
    if (!orderData.contactNumber) {
      console.warn('No contact number provided for SMS')
      return false
    }

    const response = await fetch('/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: orderData.contactNumber,
        orderNumber: orderData.orderNumber,
        customerName: orderData.customerName,
        deliveryDate: orderData.deliveryDate,
        totalAmount: orderData.totalAmount,
        itemCount: orderData.itemCount
      }),
    })

    if (response.ok) {
      const result = await response.json()
      console.log('SMS sent successfully:', result.message)
      return true
    } else {
      const error = await response.json()
      console.error('Failed to send SMS:', error.error)
      return false
    }
  } catch (error) {
    console.error('SMS sending error:', error)
    return false
  }
}
