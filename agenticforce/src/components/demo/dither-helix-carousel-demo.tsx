import DitherHelixCarousel from "@/components/ui/dither-helix-carousel";

const items = [
  { image: "https://cdn.21st.dev/assets/mirror/d2/d2311cb59110328cd0915e802396d34986765529602b5ee1e73535f612e41b8c.jpg", title: "Mountain Lake" },
  { image: "https://cdn.21st.dev/assets/mirror/62/62d93985beba8d66eb2b3b8c96acf67a20120293eecaa7339724353212b972d4.jpg", title: "Puppy Portrait" },
  { image: "https://cdn.21st.dev/assets/mirror/34/340127d75221c60c0f3f4f7178546bfe7e8a9eca42070d8a65e4f140350f53db.jpg", title: "Forest Path" },
  { image: "https://cdn.21st.dev/assets/mirror/90/90c61a5996a36b62b3fcd90b182efdbcc853745c3af414a0babb5ac4658a4ee3.jpg", title: "Desert Dunes" },
  { image: "https://cdn.21st.dev/assets/mirror/e5/e5da758515c102f7f29d7b918297542b2e577ecbcf771e74f465ab944306aa4e.jpg", title: "Old Bridge" },
  { image: "https://cdn.21st.dev/assets/mirror/e4/e4b2b8d81c9384e3cc6e944513804b7404b6791c3e2b9c9c34c84fff7732bb86.jpg", title: "City Alley" },
];

export default function DitherHelixCarouselDemo() {
  return (
    <div className="w-full h-screen">
      <DitherHelixCarousel
        items={items}
        brand="Studio"
        className="h-full w-full"
      />
    </div>
  );
}
