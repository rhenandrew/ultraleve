set -eu
curl -fsS http://127.0.0.1:8188/health
sudo python3 - <<'PY'
from pathlib import Path
p=Path('/etc/nginx/sites-enabled/streambr')
s=p.read_text()
anchor='    server_name api.stream.dev.br;'
assert s.count(anchor)==1
include='    include /etc/nginx/snippets/ultraleve.conf;'
if include not in s:p.write_text(s.replace(anchor,anchor+'\n'+include,1))
PY
sudo nginx -t
sudo systemctl reload nginx
ok=0
for i in $(seq 1 15); do
  if curl -fsS -H 'Host: api.stream.dev.br' http://127.0.0.1/ultraleve/health; then ok=1; break; fi
  sleep 1
done
if [ "$ok" != 1 ]; then
  sudo cp /home/ubuntu/ultraleve/nginx-before-20261024.conf /etc/nginx/sites-enabled/streambr
  sudo nginx -t && sudo systemctl reload nginx
  exit 1
fi
curl -fsS -H 'Host: api.stream.dev.br' http://127.0.0.1/health
echo 'Painel e StreamBR saudaveis.'
