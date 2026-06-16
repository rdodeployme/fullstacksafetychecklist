# Clean GitHub Pages Upload

Upload these files to the root of the `fullstacksafetychecklist` GitHub repository:

- `index.html`
- `assets/`
- `.nojekyll`

This package is the built static site. It intentionally does not include the Vite development `src/main.tsx` root entry, because that causes a blank page on GitHub Pages when deployed from the repository root.

After upload, wait a minute for GitHub Pages to refresh, then open:

https://rdodeployme.github.io/fullstacksafetychecklist/
