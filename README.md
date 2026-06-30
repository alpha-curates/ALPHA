<p align="center">
  <img wid
    th="334" height="115" alt="Screenshot 2026-06-29 2 20 26 PM" src="https://github.com/user-attachments/assets/bfa10489-5590-481d-8f49-fb03d3a1234a" />
</p>
<p align="center">
  <img src="https://img.shields.io/badge/React-JS-blue" alt="ReactJS">
  <img src="https://img.shields.io/badge/Open-Source-green" alt="Open Source">
  <img src="https://img.shields.io/badge/Licence-MIT-orange" alt="Licence">
  
  <a href="https://github.com/vector-just-technology">
    <img src="https://img.shields.io/badge/My-Profile-purple" alt="GitHub Repo">
  </a>
  <a href="https://vector-just-technology.github.io/Home-server/#">
    <img src="https://img.shields.io/badge/Git-Site-yellow" alt="GitHub Repo">
  </a>
</p>

___

### Installation ###

Quick Installation:
```
bash <(curl -sL https://raw.githubusercontent.com/vector-just-technology/Home-server/stable/install.sh)
```
### IMPORTANT NOTE ###
__You would definitely need a fan for the Rpi, especially the Rpi 5. A recomended one is the Active Cooler__

##### Onboarding #####
To get access to the server's gui, you would need to type this command to get your ip adress:
```
hostname -y
````
Then you would need to connect to the network information given below.

__SSID__
```
V-Home-server
```
__PASSWORD__
```
homeserver
```

### Ollama Configuration ###

__Hardware__

| Board | Features | Models |
| :---: |  :---:   |  :---: |
| Raspberry Pi 4 | NONE | NONE
| Raspberry Pi 5 16GB | Images, text, code, More | Llama 1B, MISTRAL 7B |

__Only the Raspberry Pi 16GB supports it, Development with Raspberry Pi 8GB__

```
curl -fsSL https://ollama.com | sh
ollama pull mistral && ollama pull llama3.2:1b
```

### Update Features ###
##### VERSION 1.0 STABLE 20 JUNE #####

- Implemented login
- Implemented NAS Feature
- Implemented Styling
##### VERSION 1.5 STABLE 25 JUNE #####
- Added more sidebar menus
- Glass design
- Added HAS-Style device configuration
- Support for drive pooling
##### VERSION 2.0 STABLE 29 JUNE #####
- More customization
- New light theme
- AI improvement
- Added support for AI widget generation
- Efficiency improved - CPU down by 21%
- More system tools
- New App feature ( Still In development )

2026 vector all rights reserved

