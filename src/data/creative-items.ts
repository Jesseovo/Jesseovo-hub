import type { CreativeItem } from "@/types/creative";

const personal = "/creative-personal";

export const creativeItems = [
  {
    id: "neshamah",
    slug: "neshamah",
    src: `${personal}/personal-01.jpg`,
    type: "image",
    paragraph:
      "Neshamah celebrates the beauty of handmade craftsmanship through a collection of crochet bags and accessories. Every piece is carefully crafted by hand, blending timeless techniques with a refined contemporary aesthetic to create objects that feel personal, authentic, and made to last.",
    caseStudy: false,
  },
  {
    id: "anchor",
    slug: "anchor",
    src: `${personal}/personal-video-01.mp4`,
    poster: `${personal}/posters/personal-video-01.jpg`,
    type: "video",
    paragraph:
      "Lorem ipsum dolor sit amet consectetur. Quis tellus ipsum hac turpis ac dolor. Dictumst neque commodo est quam et. Nunc aenean quam phasellus lacus turpis. Rhoncus diam sed aenean egestas orci ullamcorper sed nascetur risus.",
    caseStudy: true,
    firstBlockMedia: {
      desktop: `${personal}/personal-01.jpg`,
      mobile: `${personal}/personal-01.jpg`,
    },
  },
  {
    id: "blob",
    slug: "blob",
    src: `${personal}/personal-video-02.mp4`,
    poster: `${personal}/posters/personal-video-02.jpg`,
    type: "video",
    paragraph:
      "Created as a learning experiment, this project explores material behavior and procedural modeling through Blender's node-based system. The process investigates how shaders and geometry nodes can generate organic, fluid forms, balancing technical experimentation with visual research.",
    caseStudy: false,
  },
  {
    id: "erica-basile",
    slug: "erica-basile",
    src: `${personal}/moment-wechat-qr.mp4`,
    poster: `${personal}/posters/moment-wechat-qr.jpg`,
    type: "video",
    paragraph: null,
    caseStudy: true,
  },
  {
    id: "ferrari-video",
    slug: "ferrari",
    src: `${personal}/personal-video-03.mp4`,
    poster: `${personal}/posters/personal-video-03.jpg`,
    type: "video",
    paragraph: null,
    caseStudy: true,
  },
  {
    id: "ferrari-a",
    slug: "ferrari",
    src: `${personal}/personal-03.jpg`,
    type: "image",
    paragraph: null,
    caseStudy: true,
  },
  {
    id: "ferrari-b",
    slug: "ferrari",
    src: `${personal}/personal-04.png`,
    type: "image",
    paragraph: null,
    caseStudy: true,
  },
  {
    id: "athena",
    slug: "athena",
    src: `${personal}/personal-05.jpg`,
    type: "image",
    paragraph:
      "A 3D design exploration focused on experimenting with form, lighting, materials, and composition. Created as a personal study to explore visual aesthetics and refine product visualization techniques.",
    caseStudy: false,
  },
  {
    id: "minerals",
    slug: "minerals",
    src: `${personal}/personal-06.jpg`,
    type: "image",
    paragraph:
      "A 3D design exploration focused on creating realistic rocky and mineral materials in Blender. An experimental study of textures, surface detail, and natural formations.",
    caseStudy: false,
  },
  {
    id: "manfrotto",
    slug: "manfrotto",
    src: `${personal}/sticker-forge-alpha.webm`,
    poster: `${personal}/posters/sticker-forge-alpha.jpg`,
    type: "video",
    paragraph:
      "Lorem ipsum dolor sit amet consectetur. Quis tellus ipsum hac turpis ac dolor. Dictumst neque commodo est quam et. Nunc aenean quam phasellus lacus turpis. Rhoncus diam sed aenean egestas orci ullamcorper sed nascetur risus.",
    caseStudy: false,
  },
  {
    id: "messenger",
    slug: "messenger",
    src: `${personal}/messenger.mp4`,
    poster: `${personal}/posters/messenger.jpg`,
    type: "video",
    paragraph: null,
    caseStudy: false,
    href: "https://world.jesseovo.qzz.io/",
  },
  {
    id: "palm92",
    slug: "palm92",
    src: `${personal}/replacement-video-03.mp4`,
    poster: `${personal}/posters/replacement-video-03.jpg`,
    type: "video",
    paragraph:
      "A branding project for Palm 92, focused on building a visual identity that reflects the brand's values. Typography, color, and graphic elements come together into a system designed to stay flexible across different applications and contexts.",
    caseStudy: false,
  },
  {
    id: "stefano-a",
    slug: "stefano-terraneo",
    src: `${personal}/personal-07.jpg`,
    type: "image",
    paragraph:
      "For Stefano Terraneo, we developed the visual direction behind Stefano Terraneo's brand identity, crafting a series of images that capture its tone and personality. The work focuses on composition, color, and detail, translating the brand's essence into a coherent visual language.",
    caseStudy: false,
  },
  {
    id: "stefano-b",
    slug: "stefano-terraneo",
    src: `${personal}/moment-jesseovo-profile.mp4`,
    poster: `${personal}/posters/moment-jesseovo-profile.jpg`,
    type: "video",
    paragraph:
      "For Stefano Terraneo, we developed the visual direction behind Stefano Terraneo's brand identity, crafting a series of images that capture its tone and personality. The work focuses on composition, color, and detail, translating the brand's essence into a coherent visual language.",
    caseStudy: false,
  },
  {
    id: "touch-designer",
    slug: "touch-designer",
    src: `${personal}/replacement-video-02.mp4`,
    poster: `${personal}/posters/replacement-video-02.jpg`,
    type: "video",
    paragraph:
      "Created as a learning experiment, this project explores the creative possibilities of TouchDesigner through procedural visuals, real-time interactions, and generative workflows. The process focuses on understanding the software’s node-based environment while experimenting with motion, composition, and visual systems.",
    caseStudy: false,
  },
  {
    id: "verniciatura-video",
    slug: "verniciatura-rosa",
    src: `${personal}/replacement-video-01.mp4`,
    poster: `${personal}/posters/replacement-video-01.jpg`,
    type: "video",
    paragraph:
      "Created as a branding project, this work explores the visual identity of Verniciatura Rosa through color, typography, and graphic elements. The process focuses on translating the brand's character into a cohesive system, while ensuring clarity and consistency across every touchpoint.",
    caseStudy: false,
  },
  {
    id: "verniciatura-a",
    slug: "verniciatura-rosa",
    src: `${personal}/moment-ai-corner.mp4`,
    poster: `${personal}/posters/moment-ai-corner.jpg`,
    type: "video",
    paragraph:
      "Created as a branding project, this work explores the visual identity of Verniciatura Rosa through color, typography, and graphic elements. The process focuses on translating the brand's character into a cohesive system, while ensuring clarity and consistency across every touchpoint.",
    caseStudy: false,
  },
  {
    id: "verniciatura-b",
    slug: "verniciatura-rosa",
    src: "/creative-generated/moment-illustration.png",
    type: "image",
    paragraph:
      "Created as a branding project, this work explores the visual identity of Verniciatura Rosa through color, typography, and graphic elements. The process focuses on translating the brand's character into a cohesive system, while ensuring clarity and consistency across every touchpoint.",
    caseStudy: false,
  },
] as unknown as CreativeItem[];
