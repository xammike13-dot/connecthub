// ProductScrollRow.jsx – re-exports ProductRow for backward compatibility
import ProductRow from './ProductRow';

export default function ProductScrollRow(props) {
  return <ProductRow {...props} />;
}
