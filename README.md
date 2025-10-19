# Secure Application Design - AREP Workshop

## Descripción

Este proyecto implementa una aplicación web segura de dos capas desplegada en AWS, siguiendo las mejores prácticas de seguridad empresarial. La arquitectura consta de:

- **Servidor 1 (Apache)**: Sirve el cliente HTML+JavaScript asíncrono sobre conexión segura TLS
- **Servidor 2 (Spring Boot)**: Proporciona servicios REST seguros con autenticación

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                        AWS Cloud                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐         ┌──────────────────┐      │
│  │   Apache Server  │         │  Spring Server   │      │
│  │   (EC2 Instance) │         │  (EC2 Instance)  │      │
│  │                  │         │                  │      │
│  │  - Port 443 HTTPS│────────▶│  - Port 443 TLS  │      │
│  │  - index.html    │         │  - REST API      │      │
│  │  - app.js        │         │  - Auth Security │      │
│  │  - TLS/SSL       │         │  - Password Hash │      │
│  └──────────────────┘         └──────────────────┘      │
│         ▲                                                │
│         │ HTTPS (TLS)                                    │
│         │                                                │
└─────────┼────────────────────────────────────────────────┘
          │
    ┌─────┴──────┐
    │   Cliente  │
    │  Navegador │
    └────────────┘
```

## Características de Seguridad

### 1. **Cifrado TLS/SSL**
- Comunicación cifrada entre cliente y servidores
- Certificados SSL/TLS configurados (keystore PKCS12)

### 2. **Autenticación y Autorización**
- Spring Security con autenticación HTTP Basic
- Gestión de usuarios y roles


### 3. **Cliente Asíncrono**
- JavaScript moderno con `async/await`
- Fetch API para comunicación con backend
- Autenticación Basic Auth en headers

## 📁 Estructura del Proyecto

```
Secure-Application-Design/
├── apache/
│   ├── index.html          # Página principal del cliente
│   └── app.js              # Lógica asíncrona del cliente
│
├── secureapp/              # Aplicación Spring Boot
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── eci/edu/co/secureapp/
│   │   │   │       ├── SecureappApplication.java
│   │   │   │       ├── HelloController.java
│   │   │   │       └── SecurityConfig.java
│   │   │   └── resources/
│   │   │       └── application.properties
│   │   └── test/
│   ├── pom.xml
│   └── mvnw
│
└── README.md
```

## Configuración y Despliegue

### Prerrequisitos

- Java 17 o superior
- Maven 3.6+
- Node.js (para Apache/servidor estático)
- Cuenta de AWS con 2 instancias EC2

### Configuración del Backend (Spring Boot)

#### Instalación Local

```bash
cd secureapp
./mvnw clean install
./mvnw spring-boot:run
```

#### Configuración SSL

El archivo `application.properties` contiene:

```properties
server.address=0.0.0.0
server.port=443
server.ssl.enabled=true
server.ssl.key-store=classpath:keystore.p12
server.ssl.key-store-password=Juandavid123.
server.ssl.key-store-type=PKCS12
```

**Generar keystore para desarrollo:**

```bash
keytool -genkeypair -alias secureapp -keyalg RSA -keysize 2048 \
  -storetype PKCS12 -keystore keystore.p12 -validity 365 \
  -storepass Juandavid123.
```

Copiar el keystore generado a `src/main/resources/`

#### Usuarios Configurados

- **Usuario**: `admin`
- **Contraseña**: `password`
- **Rol**: `USER`

### Configuración del Frontend (Apache)

#### Instalación en EC2 (Amazon Linux 2023)

```bash
# Actualizar el sistema
sudo dnf update -y

# Instalar Apache
sudo dnf install -y httpd mod_ssl

# Iniciar Apache
sudo systemctl start httpd
sudo systemctl enable httpd

# Copiar archivos del cliente
sudo cp apache/index.html /var/www/html/
sudo cp apache/app.js /var/www/html/

# Configurar permisos
sudo chown -R apache:apache /var/www/html/
sudo chmod -R 755 /var/www/html/
```

#### Configuración TLS en Apache

Editar `/etc/httpd/conf.d/ssl.conf`:

```apache
<VirtualHost *:443>
    ServerName tu-dominio.com
    DocumentRoot /var/www/html
    
    SSLEngine on
    SSLCertificateFile /etc/pki/tls/certs/servidor.crt
    SSLCertificateKeyFile /etc/pki/tls/private/servidor.key
    
    # Habilitar CORS para comunicación con Spring
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
</VirtualHost>
```

### Despliegue en AWS

#### Servidor Apache (EC2 Instance 1)

1. Crear instancia EC2 (Amazon Linux 2023)
2. Security Group: Permitir puertos 80, 443
3. Instalar Apache según las instrucciones anteriores
4. Configurar certificado Let's Encrypt:

```bash
sudo dnf install -y certbot python3-certbot-apache
sudo certbot --apache -d tu-dominio.com
```

#### Servidor Spring (EC2 Instance 2)

1. Crear instancia EC2 (Amazon Linux 2023)
2. Security Group: Permitir puerto 443
3. Instalar Java 17:

```bash
sudo dnf install -y java-17-amazon-corretto
```

4. Copiar JAR y ejecutar:

```bash
scp target/secureapp-0.0.1-SNAPSHOT.jar ec2-user@tu-servidor-spring:~/
ssh ec2-user@tu-servidor-spring
sudo java -jar secureapp-0.0.1-SNAPSHOT.jar
```

5. Configurar como servicio systemd:

```bash
sudo nano /etc/systemd/system/secureapp.service
```

```ini
[Unit]
Description=Secure Spring Application
After=network.target

[Service]
Type=simple
User=ec2-user
ExecStart=/usr/bin/java -jar /home/ec2-user/secureapp-0.0.1-SNAPSHOT.jar
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable secureapp
sudo systemctl start secureapp
```

### Actualizar Cliente con IP del Backend

Modificar `app.js` con la URL del servidor Spring:

```javascript
async function login() {
  const response = await fetch("https://tu-servidor-spring.com/api/hello", {
    method: "GET",
    headers: {
      "Authorization": "Basic " + btoa("admin:password")
    }
  });
  const data = await response.text();
  alert(data);
}
login();
```

## Pruebas

### Probar Backend

```bash
curl -k -u admin:password https://localhost:443/api/hello
```

Respuesta esperada: `Hello from Secure Spring Backend!`


##  Video Demostración

el video se encuentra en el archivo raiz, donde se envidencia el despliegue en las dos EC2

## Autor

**Juan David**
- GitHub: https://github.com/Enigmus12/Secure-Application-Design.git

## Referencias

- [AWS EC2 LAMP Setup - Amazon Linux 2023](https://docs.aws.amazon.com/linux/al2023/ug/ec2-lamp-amazon-linux-2023.html)
- [Spring Security Getting Started](https://spring.io/guides/gs/securing-web)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

## Licencia

Este proyecto es parte del Taller 6 de Arquitectura Empresarial (AREP) - ECI 2025