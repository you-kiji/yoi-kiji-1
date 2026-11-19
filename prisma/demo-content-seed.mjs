import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

if (process.env.DEMO_SEED_ENV !== "preview" || process.env.VERCEL_ENV === "production") {
  throw new Error("Demo seed is restricted to an explicitly selected non-production preview database. Set DEMO_SEED_ENV=preview only after verifying DATABASE_URL.");
}

const customers = [
  ["demo.customer01@example.invalid", "Aarav Mehta"],
  ["demo.customer02@example.invalid", "Mira Kapoor"],
  ["demo.customer03@example.invalid", "Ishaan Rao"],
  ["demo.customer04@example.invalid", "Anaya Shah"],
  ["demo.customer05@example.invalid", "Kabir Malhotra"],
  ["demo.customer06@example.invalid", "Tara Iyer"],
  ["demo.customer07@example.invalid", "Reyansh Sen"],
  ["demo.customer08@example.invalid", "Kiara Nair"],
];
const blogCategories = [
  ["Living, Thoughtfully", "living-thoughtfully", "Ideas for calm, considered spaces and everyday rituals."],
  ["Material Notes", "material-notes", "A closer look at fibres, finishes, weaves and responsible care."],
  ["The YOI Journal", "yoi-journal", "Stories, styling notes and inspiration from the YOI KIJI studio."],
];
const blogTags = [
  ["Japanese interiors", "japanese-interiors"], ["Cotton", "cotton"], ["Linen", "linen"],
  ["Care guide", "care-guide"], ["Bedroom styling", "bedroom-styling"], ["Slow living", "slow-living"],
  ["Textile guide", "textile-guide"], ["Home rituals", "home-rituals"],
];
const posts = [
  {slug:"a-quieter-bedroom-in-five-layers",title:"A Quieter Bedroom in Five Thoughtful Layers",status:"PUBLISHED",category:"living-thoughtfully",tags:["japanese-interiors","bedroom-styling","slow-living"],days:18,excerpt:"Build a restful bedroom with breathable layers, considered texture and a softer approach to colour.",body:"# A quieter bedroom\n\nA restful room is rarely created by one statement piece. It comes together through a thoughtful balance of texture, light and proportion.\n\n## Begin with the base\nChoose a breathable sheet that feels comfortable through the seasons. Cotton percale offers a crisp hand, while sateen has a smoother drape.\n\n## Add quiet texture\nLayer a light coverlet, a tactile cushion and a throw. Keep the palette close in tone and let the weave do the talking.\n\n## Leave room to breathe\nA considered bedroom does not need to be crowded. Give each material and object enough space to be appreciated.\n\n*Preview editorial sample — replace with approved brand photography and final editorial copy before production.*"},
  {slug:"cotton-percale-or-sateen",title:"Cotton Percale or Sateen: Understanding the Difference",status:"PUBLISHED",category:"material-notes",tags:["cotton","textile-guide"],days:12,excerpt:"Two familiar cotton weaves, two distinct finishes. Learn what changes in feel, drape and everyday use.",body:"# Percale and sateen\n\nThe difference between percale and sateen begins with the weave. Percale uses a simple one-over, one-under structure that creates a matte, crisp surface. Sateen uses a satin weave that brings more yarn to the surface for a smoother feel and subtle lustre.\n\n## Which should you choose?\nChoose percale if you enjoy a cool, crisp hand. Choose sateen if you prefer a smoother drape. Thread count alone does not tell the whole story: fibre quality, yarn construction and finishing matter too.\n\n*Preview editorial sample — illustrative information for catalogue testing.*"},
  {slug:"the-small-ritual-of-a-fresh-towel",title:"The Small Ritual of a Fresh Towel",status:"PUBLISHED",category:"yoi-journal",tags:["home-rituals","care-guide","slow-living"],days:7,excerpt:"A simple care routine can help bath linen stay soft, absorbent and ready for everyday use.",body:"# A small daily ritual\n\nShake towels out before drying, leave space for airflow and avoid overloading the washing machine. Follow the care label for temperature and detergent guidance.\n\n## Keep the finish comfortable\nFabric softener can reduce absorbency over time. Use it sparingly, and make sure towels dry fully between uses.\n\n*Preview editorial sample — confirm product-specific care instructions before publishing.*"},
  {slug:"linen-curtains-and-daylight",title:"Linen Curtains and the Art of Daylight",status:"DRAFT",category:"living-thoughtfully",tags:["linen","japanese-interiors"],days:3,excerpt:"An unfinished styling note about filtered daylight, soft folds and natural texture.",body:"# Let the daylight in\n\nLinen curtains soften a room without making it feel closed. Their natural texture creates gentle variation as daylight moves through the day.\n\n## Consider the fall\nMeasure the finished drop carefully and consider whether the room needs privacy lining.\n\n*Draft sample. Not approved for publication.*"},
  {slug:"choosing-the-right-bath-linen-weight",title:"Choosing the Right Bath Linen Weight",status:"SCHEDULED",category:"material-notes",tags:["textile-guide","care-guide"],days:0,excerpt:"A practical introduction to GSM, absorbency and drying time for bath linen.",body:"# Understanding towel weight\n\nGSM describes grams per square metre. A higher number often indicates a denser towel, but construction and fibre quality also influence absorbency and drying time.\n\n*Scheduled preview sample. Confirm all product specifications before publication.*",scheduled:true},
  {slug:"a-note-on-seasonal-table-linen",title:"A Note on Seasonal Table Linen",status:"ARCHIVED",category:"yoi-journal",tags:["slow-living","home-rituals"],days:80,excerpt:"An archived editorial example for testing content lifecycle controls.",body:"# A table for the season\n\nA simple table setting can make everyday meals feel considered. This archived sample exists to exercise editorial archive workflows.\n\n*Archived demo content.*"},
];

async function main() {
  const productRows = await prisma.product.findMany({ where: { isActive: true }, include: { variants: { where: { isActive: true }, orderBy: { createdAt: "asc" }, take: 1 }, images: { take: 1 } }, orderBy: { name: "asc" }, take: 100 });
  if (productRows.length < 2) throw new Error("Seed the preview product catalogue before running the demo content seed.");
  const demoUsers = [];
  for (const [email, name] of customers) {
    const user = await prisma.user.upsert({ where: { email }, update: { name, role: "CUSTOMER" }, create: { email, name, role: "CUSTOMER", passwordHash: null } });
    demoUsers.push(user);
  }

  const categories = new Map();
  for (const [name, slug, description] of blogCategories) {
    const row = await prisma.blogCategory.upsert({ where: { slug }, update: { name, description }, create: { name, slug, description } });
    categories.set(slug, row);
  }
  const tags = new Map();
  for (const [name, slug] of blogTags) {
    const row = await prisma.blogTag.upsert({ where: { slug }, update: { name }, create: { name, slug } });
    tags.set(slug, row);
  }
  const author = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  for (const [postIndex, post] of posts.entries()) {
    const publishedAt = post.status === "PUBLISHED" ? new Date(Date.now() - post.days * 86400000) : null;
    const scheduledAt = post.scheduled ? new Date("2026-12-05T09:00:00.000Z") : null;\n    const coverImageUrl = ["https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1400&q=85", "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&q=85", "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1400&q=85"][postIndex % 3];
    const row = await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: { title: post.title, excerpt: post.excerpt, contentMarkdown: post.body, coverImageUrl, coverImageAlt: "Illustrative editorial preview image", status: post.status, publishedAt, scheduledAt, noIndex: false, authorId: author?.id ?? null, seoTitle: post.title + " | YOI KIJI Journal", seoDescription: post.excerpt },
      create: { title: post.title, slug: post.slug, excerpt: post.excerpt, contentMarkdown: post.body, status: post.status, publishedAt, scheduledAt, noIndex: false, authorId: author?.id ?? null, seoTitle: post.title + " | YOI KIJI Journal", seoDescription: post.excerpt, coverImageAlt: "Illustrative YOI KIJI editorial preview image" },
    });
    await prisma.blogPostCategory.deleteMany({ where: { postId: row.id } });
    await prisma.blogPostTag.deleteMany({ where: { postId: row.id } });
    await prisma.blogPostProduct.deleteMany({ where: { postId: row.id } });
    await prisma.blogPostCategory.create({ data: { postId: row.id, categoryId: categories.get(post.category).id } });
    await prisma.blogPostTag.createMany({ data: post.tags.map(slug => ({ postId: row.id, tagId: tags.get(slug).id })), skipDuplicates: true });
    await prisma.blogPostProduct.createMany({ data: productRows.slice(0, 2).map((product, index) => ({ postId: row.id, productId: product.id, sortOrder: index })), skipDuplicates: true });
  }

  const reviewTitles = ["Sample review: beautifully considered", "Sample review: lovely everyday texture", "Sample review: a calm addition"];
  const reviewBodies = [
    "DEMO CONTENT — illustrative preview feedback only, not a real customer testimonial or verified purchase. The fabric texture and finish are represented here to test the review layout.",
    "DEMO CONTENT — sample editorial feedback for preview testing. Replace with genuine customer-submitted feedback before production.",
    "DEMO CONTENT — placeholder review copy used to validate ratings, moderation and responsive review cards.",
  ];
  for (let index = 0; index < productRows.length; index++) {
    const product = productRows[index];
    for (let slot = 0; slot < 3; slot++) {
      const customer = demoUsers[(index + slot) % demoUsers.length];
      await prisma.review.upsert({
        where: { productId_userId: { productId: product.id, userId: customer.id } },
        update: { rating: slot === 2 ? 4 : 5, title: reviewTitles[slot], body: reviewBodies[slot], status: slot === 2 ? "PENDING" : "APPROVED", verifiedPurchase: false, adminNote: "DEMO SEED — not a verified purchase; never treat as a genuine testimonial." },
        create: { productId: product.id, userId: customer.id, rating: slot === 2 ? 4 : 5, title: reviewTitles[slot], body: reviewBodies[slot], status: slot === 2 ? "PENDING" : "APPROVED", verifiedPurchase: false, adminNote: "DEMO SEED — not a verified purchase; never treat as a genuine testimonial." },
      });
    }
  }

  const couponSeeds = [
    { code: "YOIWELCOME10", description: "Preview-only 10% welcome promotion", discountType: "PERCENTAGE", discountValue: 10, minimumSubtotalPaise: 150000, maximumDiscountPaise: 50000, usageLimit: 100 },
    { code: "YOIHOME250", description: "Preview-only ₹250 home refresh offer", discountType: "FIXED_AMOUNT", discountValue: 25000, minimumSubtotalPaise: 200000, maximumDiscountPaise: null, usageLimit: 50 },
    { code: "YOILINEN15", description: "Preview-only 15% linen edit promotion", discountType: "PERCENTAGE", discountValue: 15, minimumSubtotalPaise: 300000, maximumDiscountPaise: 75000, usageLimit: 25 },
  ];
  for (const coupon of couponSeeds) await prisma.coupon.upsert({ where: { code: coupon.code }, update: { ...coupon, isActive: true }, create: { ...coupon, isActive: true } });

  const sections = [
    { key: "demo-hero", eyebrow: "A MORE CONSIDERED HOME", title: "Quiet comfort, thoughtfully made.", body: "A preview of the YOI KIJI editorial storefront experience.", imageUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1800&q=85", imageAlt: "Calm neutral living room with layered natural textures", ctaLabel: "Explore the collection", ctaHref: "/shop", position: 90 },
    { key: "demo-material-story", eyebrow: "MATERIAL NOTES", title: "Texture is its own kind of language.", body: "Explore the fibres, weaves and thoughtful details behind each piece.", imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&q=85", imageAlt: "Natural textile details in a softly lit interior", ctaLabel: "Read the journal", ctaHref: "/journal", position: 91 },
    { key: "demo-care-story", eyebrow: "CARE, WITH INTENTION", title: "Keep the pieces you love, longer.", body: "Simple care notes for everyday textiles.", imageUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1400&q=85", imageAlt: "Thoughtfully arranged home textiles", ctaLabel: "Discover care notes", ctaHref: "/journal", position: 92 },
  ];
  for (const section of sections) await prisma.homepageSection.upsert({ where: { key: section.key }, update: section, create: section });

  const collections = [
    ["The Quiet Bedroom", "the-quiet-bedroom", "Soft layers, breathable cotton and calm bedroom essentials."],
    ["Light & Privacy", "light-and-privacy", "Curtains and layers that shape the light in your room."],
    ["Everyday Rituals", "everyday-rituals", "Bath and kitchen linen for daily moments."],
    ["Material Stories", "material-stories", "Explore texture, weave and thoughtful finishes."],
  ];
  for (const [index, [name, slug, description]] of collections.entries()) {
    const collection = await prisma.storeCollection.upsert({ where: { slug }, update: { name, description, isActive: true, sortOrder: 20 + index }, create: { name, slug, description, isActive: true, sortOrder: 20 + index } });
    const matching = productRows.filter(product => {
      const category = product.categoryId ? product.categoryId : "";
      return index === 0 ? /bedsheet/i.test(product.name) : index === 1 ? /curtain/i.test(product.name) : index === 2 ? /towel|bath|kitchen/i.test(product.name) : Boolean(category);
    }).slice(0, 5);
    await prisma.storeCollectionProduct.createMany({ data: matching.map((product, sortOrder) => ({ collectionId: collection.id, productId: product.id, sortOrder })), skipDuplicates: true });
  }

  const folders = [
    ["Storefront imagery", "storefront-imagery"], ["Editorial", "editorial"], ["Product details", "product-details"], ["Campaigns", "campaigns"],
  ];
  const folderRows = new Map();
  for (const [name, slug] of folders) folderRows.set(slug, await prisma.mediaFolder.upsert({ where: { slug }, update: { name }, create: { name, slug } }));
  const media = [
    ["demo-bedroom-hero", "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1800&q=85", "A calm bedroom interior with layered textiles", "storefront-imagery", "hero,bedroom,interior"],
    ["demo-linen-detail", "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&q=85", "Natural linen texture in soft daylight", "product-details", "linen,texture,material"],
    ["demo-living-room", "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1600&q=85", "Neutral living room with natural textures", "storefront-imagery", "living-room,interior"],
    ["demo-editorial-table", "https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?w=1400&q=85", "Thoughtful dining and table styling", "editorial", "table,editorial,home"],
    ["demo-bath-linen", "https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1400&q=85", "Folded bath linen in a minimal bathroom", "product-details", "bath,towel,linen"],
    ["demo-curtain-light", "https://images.unsplash.com/photo-1615874694520-474822394e73?w=1400&q=85", "Daylight filtering through soft curtains", "editorial", "curtains,light,interior"],
  ];
  for (const [publicId, secureUrl, altText, folderName, tagText] of media) {
    const folder = folderRows.get(folderName);
    await prisma.mediaAsset.upsert({ where: { publicId }, update: { secureUrl, altText, title: "DEMO — " + altText, folderId: folder.id, tags: tagText.split(",") }, create: { publicId, secureUrl, resourceType: "IMAGE", format: "jpg", originalFilename: publicId + ".jpg", altText, title: "DEMO — " + altText, bytes: 240000, width: 1600, height: 1100, folderId: folder.id, tags: tagText.split(",") } });
  }

  const tagNames = [["Preview customer", "#65745f"], ["Home styling", "#9b815a"], ["Repeat interest", "#54745b"], ["Needs follow-up", "#9b6b55"]];
  const crmTags = new Map();
  for (const [name, color] of tagNames) crmTags.set(name, await prisma.customerTag.upsert({ where: { name }, update: { color }, create: { name, color } }));
  for (let index = 0; index < demoUsers.length; index++) {
    const customer = demoUsers[index];
    const assigned = index % 2 === 0 ? ["Preview customer", "Home styling"] : ["Preview customer", "Needs follow-up"];
    for (const name of assigned) await prisma.customerTagAssignment.upsert({ where: { userId_tagId: { userId: customer.id, tagId: crmTags.get(name).id } }, update: {}, create: { userId: customer.id, tagId: crmTags.get(name).id } });
    await prisma.customerNote.upsert({ where: { id: "demo-note-" + (index + 1) }, update: { body: "DEMO CRM NOTE — customer profile sample for preview workflow testing." }, create: { id: "demo-note-" + (index + 1), userId: customer.id, authorId: author?.id ?? null, body: "DEMO CRM NOTE — customer profile sample for preview workflow testing." } });
    await prisma.customerActivity.upsert({ where: { id: "demo-activity-" + (index + 1) }, update: { summary: "DEMO ACTIVITY — sample customer profile opened in preview." }, create: { id: "demo-activity-" + (index + 1), userId: customer.id, actorId: author?.id ?? null, type: "DEMO_PROFILE_VIEW", summary: "DEMO ACTIVITY — sample customer profile opened in preview.", metadata: { source: "preview-seed", sample: true } } });
    const address = await prisma.address.findFirst({ where: { userId: customer.id } });
    if (!address) await prisma.address.create({ data: { userId: customer.id, fullName: customer.name ?? "Demo Customer", phone: "9000000000", line1: "Preview Sample Address, Demo Lane", city: "Jaipur", state: "Rajasthan", postalCode: "302019", countryCode: "IN", isDefault: true } });
    const wishlistProduct = productRows[index % productRows.length];
    await prisma.wishlistItem.upsert({ where: { userId_productId: { userId: customer.id, productId: wishlistProduct.id } }, update: {}, create: { userId: customer.id, productId: wishlistProduct.id } });
  }

  const orderStates = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
  for (let index = 0; index < 4; index++) {
    const product = productRows[index];
    const variant = product.variants[0] ?? null;
    const quantity = index % 2 + 1;
    const price = variant?.pricePaise ?? product.pricePaise;
    const orderNumber = "YK-DEMO-2026-" + String(index + 1).padStart(4, "0");
    const guest = index === 3;
    const orderData = {
      orderNumber,
      userId: guest ? null : demoUsers[index].id,
      guestName: guest ? "Demo Guest Buyer" : null,
      guestEmail: guest ? "guest.preview@example.invalid" : null,
      guestPhone: guest ? "9000000000" : null,
      status: orderStates[index],
      subtotalPaise: price * quantity,
      taxPaise: 0,
      shippingPaise: 0,
      discountPaise: 0,
      totalPaise: price * quantity,
      shippingAddress: { fullName: guest ? "Demo Guest Buyer" : demoUsers[index].name, phone: "9000000000", line1: "Preview Sample Address, Demo Lane", city: "Jaipur", state: "Rajasthan", postalCode: "302019", countryCode: "IN" },
      billingAddress: { fullName: guest ? "Demo Guest Buyer" : demoUsers[index].name, phone: "9000000000", line1: "Preview Sample Address, Demo Lane", city: "Jaipur", state: "Rajasthan", postalCode: "302019", countryCode: "IN" },
      items: { create: [{ productId: product.id, variantId: variant?.id ?? null, productName: product.name, variantLabel: variant?.label ?? null, sku: variant?.sku ?? product.sku, hsnCode: product.hsnCode, quantity, unitPricePaise: price, gstRateBps: product.gstRateBps }] },
      payment: { create: { provider: "COD", status: index === 3 ? "CREATED" : "CAPTURED", amountPaise: price * quantity, currency: "INR" } },
    };
    await prisma.order.upsert({ where: { orderNumber }, update: {}, create: orderData });
  }

  console.log(JSON.stringify({
    customers: demoUsers.length,
    publishedAndLifecycleBlogPosts: posts.length,
    approvedAndPendingDemoReviews: productRows.length * 3,
    coupons: couponSeeds.length,
    homepageSections: sections.length,
    collections: collections.length,
    mediaAssets: media.length,
    crmTags: tagNames.length,
    demoOrders: orderStates.length,
    note: "All generated customer, review, blog, media, CRM and order records are preview-only sample data. Reviews are never marked as verified purchases.",
  }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
