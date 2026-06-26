# Onboarding carousel screenshots

Drop the slide screenshots here (captured from the live app — the same shots the
old spotlight tour pointed at), then reference them from `../slides.js`.

Expected files (one per slide `key` in `slides.js`):

| Slide key  | Suggested file       | Shows                                  |
|------------|----------------------|----------------------------------------|
| `home`     | `home.png`           | The Home Bani list                     |
| `audio`    | `audio.png`          | The audio button in the reader nav     |
| `tracks`   | `tracks.png`         | The artist / track picker              |
| `next`     | `next.png`           | The Next button in the picker          |
| `play`     | `play.png`           | The play / pause control               |
| `download` | `download.png`       | The download button                    |
| `manage`   | `manage.png`         | The Manage Downloads screen            |

To wire one up, edit `../slides.js` and set, e.g.:

```js
{ key: "home", titleKey: "TOUR_HOME_TITLE", bodyKey: "TOUR_HOME_BODY", image: require("./images/home.png") },
```

Until a slide's image is added, `image: null` renders a dashed placeholder in its
place — the carousel is fully functional without the screenshots.

Use tall portrait PNGs (roughly phone-aspect, e.g. ~1080×1920) so they fit the
`resizeMode="contain"` image area cleanly.
