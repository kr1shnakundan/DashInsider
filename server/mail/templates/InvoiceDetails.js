exports.InvoiceDetailsMail = (
    invoiceData
) =>{
    return `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
				<h2 style="color: #333; margin-bottom: 20px;">Invoice Details</h2>
				<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
					<tr style="border-bottom: 1px solid #ddd;">
						<td style="padding: 10px; font-weight: bold;">Invoice ID:</td>
						<td style="padding: 10px;">${invoiceData?.invoiceId}</td>
					</tr>
					<tr style="border-bottom: 1px solid #ddd;">
						<td style="padding: 10px; font-weight: bold;">Subscription ID:</td>
						<td style="padding: 10px;">${invoiceData?.subscriptionId}</td>
					</tr>
					${invoiceData?.paymentStatus === 'success' ? `
					<tr style="border-bottom: 1px solid #ddd;">
						<td style="padding: 10px; font-weight: bold;">Plan:</td>
						<td style="padding: 10px;">${invoiceData?.subscriptionType || "N/A"}</td>
					</tr>
					<tr style="border-bottom: 1px solid #ddd;">
						<td style="padding: 10px; font-weight: bold;">Start Date:</td>
						<td style="padding: 10px;">${invoiceData?.startedDate ? new Date(invoiceData.startedDate).toLocaleString() : "N/A"}</td>
					</tr>
					<tr style="border-bottom: 1px solid #ddd;">
						<td style="padding: 10px; font-weight: bold;">Renewal Date:</td>
						<td style="padding: 10px;">${invoiceData?.renewalDate ? new Date(invoiceData.renewalDate).toLocaleString() : "N/A"}</td>
					</tr>
					` : ''}
					<tr style="border-bottom: 1px solid #ddd;">
						<td style="padding: 10px; font-weight: bold;">Date:</td>
						<td style="padding: 10px;">${new Date(invoiceData?.date).toLocaleString()}</td>
					</tr>
					<tr style="border-bottom: 1px solid #ddd;">
						<td style="padding: 10px; font-weight: bold;">Amount:</td>
						<td style="padding: 10px;">₹${typeof invoiceData?.amount === "number" ? invoiceData.amount.toFixed(2) : "N/A"}</td>
					</tr>
					<tr style="border-bottom: 1px solid #ddd;">
						<td style="padding: 10px; font-weight: bold;">Payment Status:</td>
						<td style="padding: 10px;"><span style="color: ${invoiceData?.paymentStatus === 'success' ? '#28a745' : '#dc3545'}; font-weight: bold;">${(invoiceData?.paymentStatus || "N/A").toUpperCase()}</span></td>
					</tr>
					${invoiceData?.pendingUpgrade?.planType ? `
					<tr style="border-bottom: 1px solid #ddd;">
						<td style="padding: 10px; font-weight: bold;">Pending Upgrade:</td>
						<td style="padding: 10px;">${invoiceData.pendingUpgrade.planType}${invoiceData.pendingUpgrade.requestedAt ? ` (requested ${new Date(invoiceData.pendingUpgrade.requestedAt).toLocaleString()})` : ""}</td>
					</tr>
					` : ''}
					${invoiceData?.pendingDowngrade?.planType ? `
					<tr style="border-bottom: 1px solid #ddd;">
						<td style="padding: 10px; font-weight: bold;">Pending Downgrade:</td>
						<td style="padding: 10px;">${invoiceData.pendingDowngrade.planType}${invoiceData.pendingDowngrade.effectiveDate ? ` (effective ${new Date(invoiceData.pendingDowngrade.effectiveDate).toLocaleString()})` : ""}</td>
					</tr>
					` : ''}
					${invoiceData?.failureReason ? `
					<tr style="border-bottom: 1px solid #ddd;">
						<td style="padding: 10px; font-weight: bold;">Failure Reason:</td>
						<td style="padding: 10px;">${invoiceData?.failureReason}</td>
					</tr>
					` : ''}
					${invoiceData?.razorpayPaymentId ? `
					<tr style="border-bottom: 1px solid #ddd;">
						<td style="padding: 10px; font-weight: bold;">Payment ID:</td>
						<td style="padding: 10px;">${invoiceData?.razorpayPaymentId}</td>
					</tr>
					` : ''}
				</table>
				<p style="color: #666; margin-top: 20px; font-size: 12px;">If you have any questions about this invoice, please contact our support team.</p>
			</div>
		`
}