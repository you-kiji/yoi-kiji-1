import { beforeEach,describe,expect,it,vi } from "vitest";
import { NextRequest } from "next/server";

const mocks=vi.hoisted(()=>{
 const tx={
  productVariant:{updateMany:vi.fn()},
  product:{updateMany:vi.fn()},
  inventoryMovement:{create:vi.fn()},
  address:{findFirst:vi.fn(),create:vi.fn(),count:vi.fn()},
  order:{create:vi.fn()},
  coupon:{updateMany:vi.fn()},
  couponRedemption:{create:vi.fn()},
 };
 return {
  tx,
  prisma:{
   order:{findUnique:vi.fn()},
   product:{findMany:vi.fn()},
   coupon:{findUnique:vi.fn()},
   $transaction:vi.fn(),
  },
  getCurrentUser:vi.fn(),
  sendOrderConfirmation:vi.fn(),
  sendWhatsAppOrderConfirmation:vi.fn(),
 };
});
vi.mock("@/lib/prisma",()=>({prisma:mocks.prisma}));
vi.mock("@/lib/auth",()=>({getCurrentUser:mocks.getCurrentUser}));
vi.mock("@/lib/notifications",()=>({
 sendOrderConfirmation:mocks.sendOrderConfirmation,
 sendWhatsAppOrderConfirmation:mocks.sendWhatsAppOrderConfirmation,
}));
import { POST } from "@/app/api/checkout/route";

const body={
 checkoutKey:"6f90f3a2-b0bd-4d71-9f5c-1b6e43c07f11",
 guestAccessToken:"b5a4d2c6e8f011223344556677889900b5a4d2c6e8f011223344556677889900",
 paymentMethod:"COD",
 guestEmail:"guest@example.invalid",
 items:[{productId:"product-1",variantId:"variant-1",quantity:1}],
 shippingAddress:{fullName:"Demo Guest",phone:"9000000000",line1:"12 Preview Lane",line2:"",city:"Jaipur",state:"Rajasthan",postalCode:"302019",countryCode:"IN"},
};
function request(payload:unknown){return new NextRequest("http://localhost/api/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});}

describe("guest COD checkout",()=>{
 beforeEach(()=>{
  vi.clearAllMocks();
  vi.stubEnv("VERCEL_ENV","preview");
  vi.stubEnv("SHIPPING_FLAT_RATE_PAISE","0");
  vi.stubEnv("SHIPPING_TAX_RATE_BPS","0");
  vi.stubEnv("SHIPPING_DEFAULT_PROVIDER","");
  vi.stubEnv("SELLER_GSTIN","");
  vi.stubEnv("GST_PRICES_INCLUDE_TAX","true");
  mocks.getCurrentUser.mockResolvedValue(null);
  mocks.prisma.order.findUnique.mockResolvedValue(null);
  mocks.prisma.product.findMany.mockResolvedValue([{
   id:"product-1",name:"Demo Bedsheet",isActive:true,hasVariants:true,pricePaise:10000,sku:"DEMO-1",hsnCode:null,gstRateBps:0,
   variants:[{id:"variant-1",label:"King",sku:"DEMO-1-K",pricePaise:10000,inventoryQty:5,isActive:true}],
  }]);
  mocks.tx.productVariant.updateMany.mockResolvedValue({count:1});
  mocks.tx.inventoryMovement.create.mockResolvedValue({id:"movement-1"});
  mocks.tx.order.create.mockResolvedValue({id:"order-1",orderNumber:"YK-TEST-0001"});
  mocks.prisma.$transaction.mockImplementation(async(callback:any)=>callback(mocks.tx));
  mocks.sendOrderConfirmation.mockResolvedValue({sent:false});
  mocks.sendWhatsAppOrderConfirmation.mockResolvedValue({sent:false});
  vi.stubGlobal("fetch",vi.fn());
 });
 it("places a guest COD order without requiring an account or Razorpay credentials",async()=>{
  const response=await POST(request(body));
  const data=await response.json();
  expect(response.status).toBe(201);
  expect(data.orderNumber).toBe("YK-TEST-0001");
  expect(data.guestAccessToken).toBe(body.guestAccessToken);
  expect(mocks.tx.order.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({
   userId:null,guestName:"Demo Guest",guestEmail:"guest@example.invalid",guestPhone:"9000000000",
   status:"CONFIRMED",payment:{create:expect.objectContaining({provider:"COD",status:"CREATED"})},
  })}));
  expect(global.fetch).not.toHaveBeenCalled();
 });
 it("requires registration before an online payment attempt",async()=>{
  const response=await POST(request({...body,paymentMethod:"RAZORPAY"}));
  expect(response.status).toBe(401);
  expect(mocks.prisma.product.findMany).not.toHaveBeenCalled();
  expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
 });
 it("rejects malformed Indian PIN codes before reading inventory",async()=>{
  const response=await POST(request({...body,shippingAddress:{...body.shippingAddress,postalCode:"30201"}}));
  expect(response.status).toBe(400);
  expect(mocks.prisma.product.findMany).not.toHaveBeenCalled();
 });
 it("returns the same guest confirmation for a valid idempotent retry",async()=>{
  const existing={id:"order-1",orderNumber:"YK-TEST-0001",userId:null,guestAccessTokenHash:(await import("node:crypto")).createHash("sha256").update(body.guestAccessToken).digest("hex"),totalPaise:10000,payment:{provider:"COD",status:"CREATED",providerOrderId:null}};
  mocks.prisma.order.findUnique.mockResolvedValue(existing);
  const response=await POST(request(body));
  const data=await response.json();
  expect(response.status).toBe(200);
  expect(data.orderNumber).toBe(existing.orderNumber);
  expect(data.guestAccessToken).toBe(body.guestAccessToken);
  expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
 });
 it("does not create an order when stock cannot be reserved",async()=>{
  mocks.tx.productVariant.updateMany.mockResolvedValue({count:0});
  const response=await POST(request(body));
  expect(response.status).toBe(409);
  expect(mocks.tx.order.create).not.toHaveBeenCalled();
 });
});
