set -eu
cd /home/ubuntu/ultraleve
mkdir -p data
sudo chown 1000:1000 data
sudo chmod 700 data
docker build -f Dockerfile.admin -t ultraleve-admin:20261024 .
if docker container inspect ultraleve-admin >/dev/null 2>&1; then
  echo 'Container existente: interromper para revisar antes de substituir.' >&2
  exit 1
fi
docker run -d --name ultraleve-admin --restart unless-stopped --memory=192m --cpus=0.5 --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m --cap-drop=ALL --security-opt=no-new-privileges -p 127.0.0.1:8188:8188 -v /home/ubuntu/ultraleve/data:/data -e ULTRA_ORIGIN=https://api.stream.dev.br ultraleve-admin:20261024
ready=0
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8188/health >/dev/null; then ready=1; break; fi
  sleep 1
done
test "$ready" = 1
sudo cp /etc/nginx/sites-enabled/streambr /home/ubuntu/ultraleve/nginx-before-20261024.conf
sudo cp nginx-ultraleve.conf /etc/nginx/snippets/ultraleve.conf
sudo python3 - <<'PY'
from pathlib import Path
p=Path('/etc/nginx/sites-enabled/streambr')
s=p.read_text()
anchor='    server_name api.stream.dev.br;'
assert s.count(anchor)==1
assert 'include /etc/nginx/snippets/ultraleve.conf;' not in s
p.write_text(s.replace(anchor,anchor+'\n    include /etc/nginx/snippets/ultraleve.conf;',1))
PY
if ! sudo nginx -t; then
  sudo cp /home/ubuntu/ultraleve/nginx-before-20261024.conf /etc/nginx/sites-enabled/streambr
  docker stop ultraleve-admin
  exit 1
fi
sudo systemctl reload nginx
if ! curl -fsS -H 'Host: api.stream.dev.br' http://127.0.0.1/ultraleve/health || ! curl -fsS -H 'Host: api.stream.dev.br' http://127.0.0.1/health; then
  sudo cp /home/ubuntu/ultraleve/nginx-before-20261024.conf /etc/nginx/sites-enabled/streambr
  sudo nginx -t && sudo systemctl reload nginx
  exit 1
fi
echo 'Painel isolado publicado; StreamBR preservado.'
