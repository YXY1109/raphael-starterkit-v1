import PopularNames from "@/components/product/popular/popular-names";

export default function PopularNamesPage() {
  return (
    <div className="container py-10">
      <div className="max-w-6xl mx-auto">
        <PopularNames showAll={true} />
      </div>
    </div>
  );
}