import { prisma } from "@/lib/prisma";

function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]??char));}

export async function sendOrderConfirmation(orderId:string){
 const apiKey=process.env.EMAIL_API_KEY,from=process.env.EMAIL_FROM;
 if(!apiKey||!from)return {sent:false,reason:"Email provider is not configured."};
 const order=await prisma.order.findUnique({where:{id:orderId},include:{user:true,items:true}});
 if(!order)return {sent:false,reason:"Order not found."};
 const recipient=order.user?.email??order.guestEmail;
 if(!recipient)return {sent:false,reason:"Order has no customer email."};
 const customerName=order.user?.name??order.guestName??"there";
 const event="ORDER_CONFIRMED";
 const log=await prisma.notificationLog.upsert({where:{orderId_channel_event:{orderId,channel:"EMAIL",event}},create:{orderId,channel:"EMAIL",event,status:"PENDING"},update:{}});
 if(log.status==="SENT"||log.status==="SENDING")return {sent:log.status==="SENT",reason:"Already processed."};
 const claim=await prisma.notificationLog.updateMany({where:{id:log.id,status:{in:["PENDING","FAILED"]}},data:{status:"SENDING",error:null}});
 if(claim.count!==1)return {sent:false,reason:"Notification is already being processed."};
 const lines=order.items.map(item=>item.productName+(item.variantLabel?" — "+item.variantLabel:"")+" × "+item.quantity).join("\n");
 const htmlLines=order.items.map(item=>"<li>"+escapeHtml(item.productName+(item.variantLabel?" — "+item.variantLabel:""))+" × "+item.quantity+"</li>").join("");
 try{
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({from,to:[recipient],subject:"Your YOI KIJI order "+order.orderNumber+" is confirmed",text:"Thank you for choosing YOI KIJI. Your order "+order.orderNumber+" is confirmed.\n\n"+lines+"\n\nOrder total: INR "+(order.totalPaise/100).toFixed(2),html:"<div style='font-family:Arial,sans-serif;color:#0e300e;max-width:600px;margin:auto'><h1 style='letter-spacing:.18em'>YOI KIJI</h1><p>Hello "+escapeHtml(customerName)+". Thank you for choosing us. Your order is confirmed.</p><h2>"+escapeHtml(order.orderNumber)+"</h2><ul>"+htmlLines+"</ul><p><strong>Order total: INR "+(order.totalPaise/100).toFixed(2)+"</strong></p><p>With care,<br/>YOI KIJI</p></div>"}),cache:"no-store"});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(typeof data.message==="string"?data.message:"Email provider rejected the message.");
  await prisma.notificationLog.update({where:{id:log.id},data:{status:"SENT",providerId:data.id??null,error:null}});
  return {sent:true};
 }catch(error){
  await prisma.notificationLog.update({where:{id:log.id},data:{status:"FAILED",error:error instanceof Error?error.message:"Delivery failed."}});
  return {sent:false,reason:"Email delivery failed."};
 }
}

export async function sendWhatsAppOrderConfirmation(orderId:string){
 const accessToken=process.env.WHATSAPP_ACCESS_TOKEN;
 const phoneNumberId=process.env.WHATSAPP_PHONE_NUMBER_ID;
 const version=process.env.WHATSAPP_API_VERSION;
 const templateName=process.env.WHATSAPP_ORDER_TEMPLATE_NAME;
 if(!accessToken||!phoneNumberId||!version||!templateName)return {sent:false,reason:"WhatsApp provider is not configured."};
 const order=await prisma.order.findUnique({where:{id:orderId},include:{user:true}});
 if(!order||!order.user?.whatsappOptIn)return {sent:false,reason:"Customer has not opted in to WhatsApp updates."};
 const address=order.shippingAddress as Record<string,string>;
 let phone=(address.phone??"").replace(/\\D/g,"");
 if(address.countryCode==="IN"&&phone.length===10)phone="91"+phone;
 if(phone.length<10)return {sent:false,reason:"Customer phone number is invalid."};
 const event="ORDER_CONFIRMED";
 const log=await prisma.notificationLog.upsert({where:{orderId_channel_event:{orderId,channel:"WHATSAPP",event}},create:{orderId,channel:"WHATSAPP",event,status:"PENDING"},update:{}});
 if(log.status==="SENT"||log.status==="SENDING")return {sent:log.status==="SENT",reason:"Already processed."};
 const claim=await prisma.notificationLog.updateMany({where:{id:log.id,status:{in:["PENDING","FAILED"]}},data:{status:"SENDING",error:null}});
 if(claim.count!==1)return {sent:false,reason:"Notification is already being processed."};
 try{
  const response=await fetch("https://graph.facebook.com/"+version+"/"+phoneNumberId+"/messages",{method:"POST",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to:phone,type:"template",template:{name:templateName,language:{code:"en"},components:[{type:"body",parameters:[{type:"text",text:order.orderNumber},{type:"text",text:"INR "+(order.totalPaise/100).toFixed(2)}]}]}}),cache:"no-store"});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(typeof data.error?.message==="string"?data.error.message:"WhatsApp provider rejected the message.");
  await prisma.notificationLog.update({where:{id:log.id},data:{status:"SENT",providerId:data.messages?.[0]?.id??null,error:null}});
  return {sent:true};
 }catch(error){
  await prisma.notificationLog.update({where:{id:log.id},data:{status:"FAILED",error:error instanceof Error?error.message:"Delivery failed."}});
  return {sent:false,reason:"WhatsApp delivery failed."};
 }
}


export async function sendOrderStatusUpdate(orderId:string,status:"PROCESSING"|"SHIPPED"|"DELIVERED"|"CANCELLED"){
 const apiKey=process.env.EMAIL_API_KEY,from=process.env.EMAIL_FROM;
 if(!apiKey||!from)return {sent:false,reason:"Email provider is not configured."};
 const order=await prisma.order.findUnique({where:{id:orderId},include:{user:true,items:true}});
 if(!order)return {sent:false,reason:"Order not found."};
 const recipient=order.user?.email??order.guestEmail;
 if(!recipient)return {sent:false,reason:"Order has no customer email."};
 const customerName=order.user?.name??order.guestName??"there";
 const event="ORDER_STATUS_"+status;
 const log=await prisma.notificationLog.upsert({
  where:{orderId_channel_event:{orderId,channel:"EMAIL",event}},
  create:{orderId,channel:"EMAIL",event,status:"PENDING"},
  update:{},
 });
 if(log.status==="SENT"||log.status==="SENDING")return {sent:log.status==="SENT",reason:"Already processed."};
 const claim=await prisma.notificationLog.updateMany({
  where:{id:log.id,status:{in:["PENDING","FAILED"]}},
  data:{status:"SENDING",error:null},
 });
 if(claim.count!==1)return {sent:false,reason:"Notification is already being processed."};
 const copy:Record<typeof status,{subject:string;heading:string;message:string}>={
  PROCESSING:{subject:"Your YOI KIJI order is being prepared",heading:"Thoughtfully being prepared.",message:"Our team is preparing your selected pieces with care."},
  SHIPPED:{subject:"Your YOI KIJI order is on its way",heading:"Your order is on its way.",message:"Your parcel has been handed over to the delivery partner."},
  DELIVERED:{subject:"Your YOI KIJI order has been delivered",heading:"A little more comfort, delivered.",message:"Your order has been marked as delivered. We hope you love your new pieces."},
  CANCELLED:{subject:"An update about your YOI KIJI order",heading:"Your order was cancelled.",message:"Your order has been cancelled. If you have questions about a payment or refund, please contact the store team."},
 };
 const details=[
  "Order: "+order.orderNumber,
  "Status: "+status.toLowerCase(),
  "Total: INR "+(order.totalPaise/100).toFixed(2),
 ];
 if(status==="SHIPPED"&&order.trackingNumber)details.push("Tracking / AWB: "+order.trackingNumber);
 const trackingUrl=order.trackingUrl&&(()=>{try{const url=new URL(order.trackingUrl);return url.protocol==="https:"?url.toString():null;}catch{return null;}})();
 if(status==="SHIPPED"&&trackingUrl)details.push("Track shipment: "+trackingUrl);
 const htmlTracking=status==="SHIPPED"&&trackingUrl?"<p><a href=\""+escapeHtml(trackingUrl)+"\">Track your shipment</a></p>":"";
 const htmlAwb=status==="SHIPPED"&&order.trackingNumber?"<p>Tracking / AWB: <strong>"+escapeHtml(order.trackingNumber)+"</strong></p>":"";
 try{
  const response=await fetch("https://api.resend.com/emails",{
   method:"POST",
   headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},
   body:JSON.stringify({
    from,to:[recipient],subject:copy[status].subject+" · "+order.orderNumber,
    text:"Hello "+customerName+",\\n\\n"+copy[status].message+"\\n\\n"+details.join("\\n")+"\\n\\nWith care,\\nYOI KIJI",
    html:"<div style='font-family:Arial,sans-serif;color:#0e300e;max-width:600px;margin:auto'><h1 style='letter-spacing:.18em'>YOI KIJI</h1><h2>"+copy[status].heading+"</h2><p>"+copy[status].message+"</p><p>Order: <strong>"+escapeHtml(order.orderNumber)+"</strong></p><p>Status: "+status.toLowerCase()+"</p>"+htmlAwb+htmlTracking+"<p>Order total: INR "+(order.totalPaise/100).toFixed(2)+"</p><p>With care,<br/>YOI KIJI</p></div>",
   }),
   cache:"no-store",
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(typeof data.message==="string"?data.message:"Email provider rejected the message.");
  await prisma.notificationLog.update({where:{id:log.id},data:{status:"SENT",providerId:data.id??null,error:null}});
  return {sent:true};
 }catch(error){
  await prisma.notificationLog.update({where:{id:log.id},data:{status:"FAILED",error:(error instanceof Error?error.message:"Delivery failed.").slice(0,1000)}});
  return {sent:false,reason:"Email delivery failed."};
 }
}
