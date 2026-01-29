import { Redirect } from "expo-router";
import { DEFAULT_CRYPTO_ID } from "@/lib/constants/cryptos";

/**
 * Index redirects to the default crypto (Bitcoin)
 */
export default function Index() {
  return <Redirect href={`/crypto/${DEFAULT_CRYPTO_ID}`} />;
}
