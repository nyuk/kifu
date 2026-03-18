# KIFU Quickstart

이 프로젝트는 아래 두 개만 기억하면 됩니다.

1. `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/KIFU-Control.command`
2. `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/scripts/devctl.sh`

## 우리가 지금 쓰는 로컬 개발 규칙

- `postgres` = Docker
- `backend` = local
- `frontend` = local

즉, 로컬에서는 앱 두 개를 Docker로 띄우지 않고 `devctl`이 관리하는 로컬 프로세스를 기준으로 봅니다.

## 제일 많이 쓰는 명령

```bash
cd /Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project

./scripts/devctl.sh restart backend
./scripts/devctl.sh restart frontend
./scripts/devctl.sh status
```

## 로그 볼 때

```bash
./scripts/devctl.sh logs backend
./scripts/devctl.sh logs frontend
```

## 이상할 때 순서

1. `./scripts/devctl.sh status`
2. `./scripts/devctl.sh logs backend`
3. `./scripts/devctl.sh logs frontend`
4. `./scripts/devctl.sh health`

## 제일 쉬운 시작 방법

- Finder에서 `/Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project/KIFU-Control.command` 더블클릭
- 또는 터미널에서:

```bash
cd /Users/gimdongnyeog/PycharmProjects/MoneyVessel_Web/kifu-project
./scripts/devctl.sh
```

## 한 줄 기억법

`KIFU-Control.command` 또는 `devctl.sh`만 쓴다.  
터미널 여러 개에서 직접 관리하지 않는다.
