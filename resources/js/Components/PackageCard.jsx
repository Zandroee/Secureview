import ProductCard from "./ProductCard";

export default function PackageCard(props) {
    return (
        <ProductCard {...props} variant="package" />
    );
}