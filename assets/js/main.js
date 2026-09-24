const username = "GenshinVideo";
const repo = "HYVLauncherVideo";
const branch = "main";

const games = [
  {
    id: "genshin",
    name: "原神",
    nameEn: "Genshin Impact",
    path: "archive/gopR6Cufr3"
  },
  {
    id: "starrail",
    name: "崩壊：スターレイル",
    nameEn: "Honkai: Star Rail",
    path: "archive/4ziysqXOQ8"
  },
  {
    id: "zzz",
    name: "ゼンレスゾーンゼロ",
    nameEn: "Zenless Zone Zero",
    path: "archive/U5hbdsT9W7"
  },
  {
    id: "hi3",
    name: "崩壊3rd",
    nameEn: "Honkai Impact 3rd",
    path: "archive/g0mMIvshDb"
  }
];

function createNavigation() {
  const nav = document.querySelector(".game-nav");

  if (!nav) return;

  nav.innerHTML = "";

  games.forEach(game => {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = game.name;
    button.dataset.path = game.path;

    button.addEventListener("click", () => {
      window.location.hash = game.path;
    });

    nav.appendChild(button);
  });
}

function updateGameNavigation(path) {
  const buttons = document.querySelectorAll(".game-nav button");

  buttons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.path === path
    );
  });
}

function updateGameTheme(game) {
  if (!game) {
    document.body.removeAttribute("data-game");
    return;
  }

  document.body.dataset.game = game.id;
}

function createGameHero(game) {
  const hero = document.createElement("div");
  hero.className = "game-hero";

  hero.innerHTML = `
    <div class="game-label">${game.nameEn}</div>
    <h1 class="game-title">${game.name}</h1>
    <p class="game-description">HoYoverse Launcher Video Archive</p>
  `;

  return hero;
}

async function handleRoute() {
  const path = window.location.hash.slice(1);
  const gallery = document.getElementById("gallery");

  if (!gallery) return;

  const game = games.find(game => game.path === path);

  if (!game) {
    gallery.innerHTML = `
      <div class="game-hero">
        <div class="game-label">HYV LAUNCHER VIDEO</div>
        <h1 class="game-title">Select a Game</h1>
        <p class="game-description">
          Select a game from the navigation above.
        </p>
      </div>
    `;

    updateGameNavigation("");
    updateGameTheme(null);
    return;
  }

  updateGameNavigation(game.path);
  updateGameTheme(game);

  gallery.innerHTML = "";
  gallery.classList.add("loading");

  const loading = document.createElement("div");
  loading.className = "loading-indicator";
  loading.textContent = "Loading videos...";
  gallery.appendChild(loading);

  const apiUrl =
    `https://api.github.com/repos/${username}/${repo}/contents/${path}?ref=${branch}`;

  try {
    const res = await fetch(apiUrl);
    const files = await res.json();

    const stateRes = await fetch("./last_check.json");
    const state = await stateRes.json();

    const officialUrls =
      state[path.split("/")[1]]?.video_urls || [];

    const groups = {};

    files.toReversed().forEach(file => {
      const match = file.name.match(/^(.*)\.([^.]+)$/);

      if (!match) return;

      const [_, base, ext] = match;

      if (!groups[base]) {
        groups[base] = [];
      }

      groups[base].push({
        ext,
        file
      });
    });

    gallery.classList.remove("loading");
    gallery.innerHTML = "";

    gallery.appendChild(createGameHero(game));

    let videoCount = 0;

    for (const base in groups) {
      const formats = groups[base];

      const videoFile = formats.find(
        f => ["webm", "mp4"].includes(f.ext.toLowerCase())
      );

      if (!videoFile) continue;

      const thumbnailFile = formats.find(
        f => ["jpg", "jpeg", "png", "webp"].includes(
          f.ext.toLowerCase()
        )
      );

      const videoUrl =
        `https://cdn.jsdelivr.net/gh/${username}/${repo}/${path}/${videoFile.file.name}`;

      const thumbnailUrl = thumbnailFile
        ? `https://raw.githubusercontent.com/${username}/${repo}/${branch}/${path}/${thumbnailFile.file.name}`
        : "";

      const card = document.createElement("div");
      card.className = "video-card";

      const video = document.createElement("video");

      video.src = videoUrl;
      video.preload = "auto";
      video.poster = thumbnailUrl;
      video.controls = false;
      video.muted = true;
      video.playsInline = true;
      video.loop = true;

      const downloads = document.createElement("div");
      downloads.className = "downloads";

      formats.forEach(({ ext, file }) => {
        if (!["webm", "mp4"].includes(ext)) return;

        const link = document.createElement("a");

        link.href =
          `https://raw.githubusercontent.com/${username}/${repo}/${branch}/${path}/${file.name}`;

        link.download = file.name;
        link.textContent = ext.toUpperCase();

        downloads.appendChild(link);
      });

      const videoUrlWithoutDate =
        videoFile.file.name
          .replace(/^\d{8}_/, "")
          .replace(/\.mp4$/i, ".webm");

      const officialUrl = officialUrls.find(
        url => url.endsWith("/" + videoUrlWithoutDate)
      );

      if (officialUrl) {
        const link = document.createElement("a");

        link.href = officialUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "OFFICIAL";

        downloads.appendChild(link);
      }

      card.appendChild(video);
      card.appendChild(downloads);

      gallery.appendChild(card);

      videoCount++;
    }

    if (videoCount === 0) {
      gallery.innerHTML = "";
      gallery.appendChild(createGameHero(game));

      const empty = document.createElement("div");
      empty.className = "gallery error";
      empty.textContent = "No video files found.";

      gallery.appendChild(empty);
      return;
    }

    setupVideoObserver();
  } catch (err) {
    gallery.classList.remove("loading");
    gallery.classList.add("error");

    gallery.innerHTML = "";
    gallery.appendChild(createGameHero(game));

    const error = document.createElement("div");
    error.className = "gallery error";
    error.textContent = "Error loading videos.";

    gallery.appendChild(error);

    console.error(err);
  }
}

function setupVideoObserver() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        const video = entry.target;

        if (entry.isIntersecting) {
          if (video.readyState >= 4) {
            video.play().catch(() => {});
          } else {
            const onCanPlayThrough = () => {
              video.play().catch(() => {});
              video.removeEventListener(
                "canplaythrough",
                onCanPlayThrough
              );
            };

            video.addEventListener(
              "canplaythrough",
              onCanPlayThrough
            );
          }
        } else {
          video.pause();
        }
      });
    },
    {
      threshold: 0.6
    }
  );

  document.querySelectorAll("video").forEach(video => {
    observer.observe(video);
  });
}

document.addEventListener("click", e => {
  if (e.target.tagName !== "VIDEO") return;

  const video = e.target;

  video.controls = !video.controls;

  if (video.controls) {
    clearTimeout(video._hideControlsTimeout);

    video._hideControlsTimeout = setTimeout(() => {
      video.controls = false;
    }, 4000);
  }
});

window.addEventListener("hashchange", handleRoute);

window.addEventListener("load", () => {
  createNavigation();
  handleRoute();
});
