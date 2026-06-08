#!/bin/bash

# ==============================================================================
# PROLISIM AUTOMATIKUS DEPLOY SCRIPT (LINUX SERVER + PM2)
# ==============================================================================
# Ez a script segít automatizálni a weboldal közzétételét egy távoli Linux szerverre.
# Futtatható a helyi gépedről (ha van rsync/ssh), vagy közvetlenül a szerverről is.

# ----------------- Kérlek módosítsd az alábbi adatokat! -----------------
SERVER_USER="zsombor"                     # A Linux szerver felhasználóneve
SERVER_IP="192.168.1.100"                 # A szerver IP címe vagy domain neve
DEPLOY_PATH="~/fizika11"                  # A célkönyvtár a szerveren (a mappád neve)
# ------------------------------------------------------------------------

# Színek a konzol kimenethez
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # Nincs szín

echo -e "${BLUE}=== ProliSim PM2 Linux Telepítés Indítása ===${NC}"

# Ellenőrizzük, hogy helyi gépről SSH-val telepítünk, vagy a szerveren futunk-e
if [ "$1" == "--local" ]; then
    echo -e "${YELLOW}[Helyi mód]${NC} A scriptet közvetlenül a Linux szerveren futtatod..."
    
    # 1. Ellenőrizzük, hogy a pm2 telepítve van-e
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}A PM2 nincs telepítve. Telepítés folyamatban...${NC}"
        npm install -g pm2
    fi
    
    # 2. PM2 indítása vagy reload
    echo "PM2 alkalmazás frissítése..."
    pm2 startOrReload ecosystem.config.js --env production
    
    # 3. PM2 mentése és startup beállítása
    pm2 save
    
    echo -e "${GREEN}=== A szimuláció sikeresen fut a PM2-vel! ===${NC}"
    pm2 status
else
    # Helyi gépről történő távoli deploy SSH + rsync segítségével
    echo -e "${YELLOW}[Távoli mód]${NC} Fájlok szinkronizálása a szerverre (${SERVER_USER}@${SERVER_IP})..."
    
    # Könyvtár létrehozása a szerveren (ha még nem létezik)
    ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${DEPLOY_PATH}"
    
    # Fájlok átmásolása rsync-el (kihagyva a felesleges Git és helyi konfigurációs fájlokat)
    rsync -avz --delete \
        --exclude '.git*' \
        --exclude 'node_modules' \
        --exclude 'deploy.sh' \
        ./ ${SERVER_USER}@${SERVER_IP}:${DEPLOY_PATH}/
        
    echo -e "${BLUE}PM2 konfiguráció frissítése a szerveren...${NC}"
    # Belépünk a szerver könyvtárába és futtatjuk a PM2-t
    ssh ${SERVER_USER}@${SERVER_IP} "cd ${DEPLOY_PATH} && pm2 startOrReload ecosystem.config.js --env production && pm2 save"
    
    echo -e "${GREEN}=== A telepítés és az alkalmazás újraindítása sikeresen befejeződött! ===${NC}"
fi
