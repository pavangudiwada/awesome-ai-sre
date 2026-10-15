import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// Frozen digests of the approved Open Lens exports: artwork must not be redrawn.
const approvedAssets = [
  ["header-wordmark-light.svg", "6c1139a437aaeeefbb976f107548a78db0c26892b81097a59e4f03e56ba35f18"],
  ["header-wordmark-dark.svg", "29e5b2dab8c243ed8442a1a95ad7040ffbda9ece62ec2e4b9fb95218257cba06"],
  ["mark-light.svg", "907c838efaad2bb981b1fd7d4dda178220f0058de89a1fae5d73eafc1b1d7584"],
  ["mark-dark.svg", "0530b331bd42214f0d19ebc5fc221a0e2f039d23bf048ac3d0014afd15b6cb44"],
  ["favicon-light.svg", "a45773b1bfb5c8e0d78b83859b6fa6ea26e32c53253643d05adb5802e10989fb"],
  ["favicon-dark.svg", "00b3e20c5c8cfe868c7c5f9b8f35be637f1b97192ba8788514d6fcafbd579d04"],
  ["favicon-16.png", "49125833fc8af4a1fd90403ae2aa25634b08cf60858ad332c1b872d236cdd8a6"],
  ["favicon-32.png", "6f82218cccde7e303e7046c95cbe028f61bad46905caa91f93e0f03643de88a3"],
  ["favicon.ico", "f41e10748468b46d2ec1737d9d4ab02830fc107ce073bf03a607f9d809a9c2d3"],
  ["apple-touch-icon.png", "a2bb12381827c70985f1ce7056b61ebf12e1defb465354e54bc9cdb579a800cd"],
] as const

describe("approved Open Lens exports", () => {
  it.each(approvedAssets)("preserves %s unchanged", (name, digest) => {
    expect(createHash("sha256").update(readFileSync(`public/brand/${name}`)).digest("hex")).toBe(digest)
  })
  it("replaces the legacy browser and touch icons with the selected identity", () => {
    for (const [master, destination] of [
      ["favicon.ico", "public/favicon.ico"],
      ["favicon-16.png", "public/favicon-16x16.png"],
      ["favicon-32.png", "public/favicon-32x32.png"],
      ["apple-touch-icon.png", "public/apple-touch-icon.png"],
      ["apple-touch-icon.png", "src/app/apple-icon.png"],
    ]) {
      expect(readFileSync(destination)).toEqual(readFileSync(`public/brand/${master}`))
    }
  })
})
