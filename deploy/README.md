# deploy/

starry-digitizer を starryai（wpd-auto と同じホスト・同じ nginx）に置くためのもの。
設計は [docs/design/starryai-auto.md](../docs/design/starryai-auto.md) の §4。

| ファイル | 役目 |
|---|---|
| `deploy.sh` | ビルドして置く（`staging` → 確かめる → `production @staging`）、`history`、`check`、`render <dir>` |
| `site.env.example` | ホストごとの値のひな形。`~/.config/starry-digitizer/site.env` に写して直す |
| `nginx/starry-digitizer.conf` | nginx の location のひな形。wpd-auto の server ブロックの中に `include` する |

- 置くのは静的ファイルだけ。API は同じホストの wpd-auto backend（`/wpd-auto/api/`、ステージングは `/wpd-auto-staging/api/`）を同じオリジンで呼ぶ。
  systemd のユニットもポートも足さない。
- starryai 向けのビルドは、Service Worker なし・Google tag なし・OCR の資産（tesseract.js）を同じオリジンから配る。
  Vercel の公開版は今までどおり（自動機能なし）。

## 初回だけ

```sh
sudo install -d -o $USER -g $USER -m 755 /srv/starry-digitizer /srv/starry-digitizer-staging   # site.env の値
install -d -m 700 ~/.config/starry-digitizer && install -m 600 deploy/site.env.example ~/.config/starry-digitizer/site.env
deploy/deploy.sh check
deploy/deploy.sh render /tmp/starry-digitizer-site
sudo install -m 644 /tmp/starry-digitizer-site/nginx/starry-digitizer.conf /etc/nginx/snippets/starry-digitizer.conf
# wpd-auto の server ブロック（/etc/nginx/sites-available/wpd-auto）に
#   include /etc/nginx/snippets/starry-digitizer.conf;
# を足す（wpd-auto 側のひな形の変更。docs/design/starryai-auto.md §4.2）
sudo nginx -t && sudo systemctl reload nginx
```

## デプロイ

```sh
deploy/deploy.sh staging [<commit>]      # /sd-staging/ で確かめる
deploy/deploy.sh production @staging     # ステージングのコミットを本番用に作り直して置く
deploy/deploy.sh history 10
```

要るもの: Node 22 以上、`flock`、`curl`、`git`。yarn は `npx yarn@1.22.22` で使う（npm のレジストリに届くこと）。
