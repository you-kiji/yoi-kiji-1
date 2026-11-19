import { getActiveCategories } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const fallbackCategories = [
  { name:"Bedsheets",note:"A softer beginning and end to every day.",image:"https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=90",slug:"bedsheets" },
  { name:"Curtains",note:"Light, filtered to feel just right.",image:"https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1400&q=90",slug:"curtains" },
  { name:"Upholstery",note:"Texture that makes a space your own.",image:"https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1400&q=90",slug:"upholstery" },
  { name:"Bath linen",note:"Everyday rituals, made more considered.",image:"https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1400&q=90",slug:"bath-linen" },
  { name:"Kitchen linen",note:"The thoughtful details of daily living.",image:"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=90",slug:"kitchen-linen" },
];

export default async function HomePage() {
  const [categoryRecords,homepageSections,collectionRecords]=await Promise.all([
    getActiveCategories(),
    prisma.homepageSection.findMany({where:{isActive:true},orderBy:{position:"asc"}}).catch(() => []),
    prisma.storeCollection.findMany({where:{isActive:true},orderBy:[{sortOrder:"asc"},{name:"asc"}]}).catch(() => []),
  ]);
  const section=(key:string)=>homepageSections.find(item=>item.key===key);
  const hero=section("hero"),intro=section("intro"),feature=section("feature"),manifesto=section("manifesto"),journal=section("journal");
  const dbCategories=categoryRecords.filter(category=>category.parentId===null);
  const imageFallbacks=Object.fromEntries(fallbackCategories.map(category=>[category.slug,category.image]));
  const categories=collectionRecords.length
    ? collectionRecords.map((item,index)=>({name:item.name,note:item.description??"Thoughtfully chosen textiles for the spaces you return to.",image:item.imageUrl??fallbackCategories[index%fallbackCategories.length].image,slug:item.slug,href:`/shop?collection=${encodeURIComponent(item.slug)}`}))
    : dbCategories.length
      ? dbCategories.map((category,index)=>({name:category.name,note:category.description??"Thoughtfully chosen textiles for the spaces you return to.",image:category.imageUrl??imageFallbacks[category.slug]??fallbackCategories[index%fallbackCategories.length].image,slug:category.slug,href:`/shop?category=${encodeURIComponent(category.slug)}`}))
       : fallbackCategories.map(category => ({ ...category, href: `/shop?category=${encodeURIComponent(category.slug)}` }));

  return <main className="home-redesign">
    <section className="editorial-hero" aria-label="YOI KIJI home textiles">
      <div className="editorial-hero__image" style={hero?.imageUrl?{backgroundImage:`url("${hero.imageUrl}")`}:undefined}/>
      <div className="editorial-hero__shade"/>
      <div className="editorial-hero__topline"><span>YOI KIJI — THE ART OF TEXTILE LIVING</span></div>
      <div className="editorial-hero__content">
        <p className="editorial-eyebrow"><span/>{hero?.eyebrow??"A QUIETER KIND OF LUXURY"}</p>
        <h1>{hero?.title??<>Make room<br/>for <em>feeling.</em></>}</h1>
        <p className="editorial-hero__description">{hero?.body??"Thoughtful textiles. Natural textures. A softer way to come home."}</p>
        <a className="editorial-cta" href={hero?.ctaHref??"/shop"}>{hero?.ctaLabel??"Explore the collection"}</a>
      </div>
      <div className="editorial-hero__bottom"><span>COMFORT, CONSIDERED.</span><span>SCROLL TO DISCOVER</span></div>
    </section>
    <section className="editorial-intro">
      <div className="editorial-intro__label"><span>{intro?.eyebrow??"THE YOI KIJI PHILOSOPHY"}</span></div>
      <div className="editorial-intro__grid">
        <h2>{intro?.title??<>Beauty lives in<br/>the <em>everyday.</em></>}</h2>
        <div><p>{intro?.body??"In the first light of morning. In the feeling of fresh linen. In the small rituals that turn a room into your own kind of sanctuary."}</p><p>We believe the things closest to us should feel considered, beautiful and made to be lived with.</p><a className="editorial-text-link" href={intro?.ctaHref??"/our-story"}>{intro?.ctaLabel??"Discover our point of view"}</a></div>
      </div>
    </section>
    <section className="editorial-collections">
      <div className="editorial-section-heading"><div><p className="editorial-eyebrow editorial-eyebrow--dark">THE COLLECTIONS</p><h2>Find your <em>own rhythm.</em></h2></div><a className="editorial-text-link" href="/shop">View all collections</a></div>
      <div className="editorial-collection-grid">{categories.map((item,index)=><a className={`editorial-collection editorial-collection--${index+1}`} href={item.href} key={item.slug}><div className="editorial-collection__photo" style={{backgroundImage:`url("${item.image}")`}}/><div className="editorial-collection__shade"/><div className="editorial-collection__copy"><span>{item.note}</span><h3>{item.name}</h3><b>DISCOVER</b></div></a>)}</div>
    </section>
    <section className="editorial-feature">
      <div className="editorial-feature__image" role="img" aria-label={feature?.imageAlt??"Softly layered natural bed linen in a sunlit bedroom"} style={feature?.imageUrl?{backgroundImage:`url("${feature.imageUrl}")`}:undefined}/>
      <div className="editorial-feature__copy"><p className="editorial-eyebrow"><span/>{feature?.eyebrow??"THE BEDDING EDIT"}</p><h2>{feature?.title??<>Rest, in<br/><em>your own way.</em></>}</h2><p>{feature?.body??"Beautifully considered bedding for slower mornings, longer evenings and everything in between."}</p><a className="editorial-cta editorial-cta--light" href={feature?.ctaHref??"/shop?category=bedsheets"}>{feature?.ctaLabel??"Shop bedsheets"}</a><small>SINGLE&nbsp;&nbsp; / &nbsp;&nbsp;DOUBLE&nbsp;&nbsp; / &nbsp;&nbsp;KING&nbsp;&nbsp; / &nbsp;&nbsp;FITTED</small></div>
    </section>
    <section className="editorial-manifesto"><span className="editorial-manifesto__flower">✳</span><p>{manifesto?.title??<>Not more things.<br/>Just more <em>meaning</em> in the things we keep.</>}</p><span className="editorial-manifesto__jp">日々を、心地よく。</span></section>
    <section className="editorial-journal"><div><p className="editorial-eyebrow"><span/>{journal?.eyebrow??"NOTES FOR LIVING WELL"}</p><h2>{journal?.title??<>A little more<br/><em>thoughtfulness.</em></>}</h2></div><p>{journal?.body??"Explore stories, care notes and considered ideas for creating spaces that feel like you."}</p><a className="editorial-text-link" href={journal?.ctaHref??"/journal"}>{journal?.ctaLabel??"Read the journal"}</a></section>
  </main>;
}
