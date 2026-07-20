# Product images

Drop product photos in this folder. They are served straight from the site root,
so `public/images/boot-ridgeline.jpg` is requested as `/images/boot-ridgeline.jpg`.

Anything in `public/` is copied to `dist/` untouched by the build. This is why
images belong here and **not** in `src/images/` — Vite does not process absolute
URL strings pointing into `src/`, so those files never reach the production
build and 404 on the deployed site.

## Filenames

Each file must match the `image` field in `public/data/products.json`:

| File | Product |
| --- | --- |
| `tent-basecamp-2.jpg` | Basecamp 2 Tent |
| `tent-ridgeback-4.jpg` | Ridgeback 4 Tent |
| `pack-summit-45.jpg` | Summit 45L Backpack |
| `pack-alpine-65.jpg` | Alpine 65L Backpack |
| `boot-ridgeline.jpg` | Ridgeline Hiking Boots |
| `shoe-approach-trail.jpg` | Approach Trail Runners |
| `jacket-summit-down.jpg` | Summit Down Jacket |
| `shell-dryridge.jpg` | Dry Ridge Rain Shell |
| `bag-nomad-20.jpg` | Nomad 20° Sleeping Bag |
| `stove-trailfire.jpg` | Trailfire Camp Stove |
| `cookset-kettle.jpg` | Kettle Camp Cook Set |
| `bottle-canyon-32.jpg` | Canyon 32oz Water Bottle |

Missing files are handled gracefully: the `<img>` is removed on load failure and
the category text placeholder shows through. Until you add a photo you will see
a 404 for it in the console, which is expected.

## Workflow

1. **Download** a photo. [Unsplash](https://unsplash.com) and
   [Pexels](https://pexels.com) are both free for commercial use with no
   attribution required.
2. **Save it into `raw-images/`**, named after the product id —
   `raw-images/pack-summit-45.jpg`. That folder is git-ignored, so full-resolution
   originals never bloat the repository.
3. **Run the optimizer:**

   ```bash
   npm run images                    # everything in raw-images/
   npm run images boot-ridgeline.jpg # just one
   ```

That writes an optimized copy to `public/images/`. A typical 4000×6000 download
goes from around 2 MB to under 100 KB — roughly 96% smaller.

The script caps the long edge at 900px, strips EXIF metadata (including GPS
coordinates, which stock photos and phone shots often carry), and re-encodes as
progressive JPEG at quality 82.

It deliberately does **not** crop to a fixed ratio. The catalog uses
`object-fit: cover`, so the browser crops for display, and cropping here as well
would silently decapitate a portrait shot.

### A note on portrait photos

Cards render 4:3 landscape. A tall portrait photo still works, but `cover` will
show a horizontal band through the middle of it. If an important part of a
product gets cut off, either crop the raw file to landscape before optimizing,
or nudge the framing in CSS:

```css
.media-image { object-position: center 30%; }
```

Landscape source photos generally look best on the cards.

## Alt text

Alt text lives in the `alt` field in `products.json`, not in the filename. Update
it to describe the photo you actually used — the placeholder descriptions there
now were written before the images existed.

Alt is only rendered on the modal image. Card and cart thumbnails use `alt=""`
deliberately: the product name sits right next to them as a link, so describing
the image again would make screen readers announce every product twice.

## Using WebP instead of JPG

WebP files are meaningfully smaller. If you convert, update the `image` field in
`products.json` to match the new extension.
