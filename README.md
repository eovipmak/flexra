# Minecraft Server Management API

A comprehensive web-based interface for managing Minecraft servers through the Pterodactyl panel API. This application provides an easy-to-use dashboard for controlling your Minecraft servers, managing plugins and mods, accessing the console, and configuring server settings.

## Features

- **Server Management**: Start, stop, restart, and monitor your Minecraft servers
- **Console Access**: View server logs and send commands directly from your browser
- **Plugin Management**: Search, install, and remove plugins from Modrinth
- **Mod Management**: Search, install, and remove mods from Modrinth
- **Server Settings**: Configure server properties and settings
- **Startup Parameters**: Customize Java arguments and startup configuration
- **File Management**: Browse, edit, and manage server files

## Requirements

- PHP 7.4 or higher
- Pterodactyl Panel with API access
- Web server (Apache, Nginx, etc.)
- Write permissions for the web server user

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/minecraft-server-manager.git
   cd minecraft-server-manager
   ```

2. **Create Environment File**
   Create a `.env` file in the root directory with the following variables:
   ```
   PTERO_PANEL_URL=https://your-panel-url.com
   PTERO_CLIENT_API_KEY=your-client-api-key
   PTERO_APPLICATION_API_KEY=your-application-api-key
   ```

3. **Set Up Web Server**
   Configure your web server to point to the project directory. Example for Apache:
   ```apache
   <VirtualHost *:80>
       ServerName minecraft-manager.example.com
       DocumentRoot /path/to/minecraft-server-manager
       
       <Directory /path/to/minecraft-server-manager>
           AllowOverride All
           Require all granted
       </Directory>
   </VirtualHost>
   ```

4. **Set Permissions**
   Ensure the web server has write permissions to the necessary directories:
   ```bash
   mkdir -p logs
   chmod -R 755 .
   chmod -R 777 logs
   ```

5. **Access the Application**
   Open your web browser and navigate to your configured domain or server IP.

## Getting Started

### Obtaining Pterodactyl API Keys

1. **Client API Key**
   - Log in to your Pterodactyl panel
   - Go to Account Settings > API Credentials
   - Create a new API key with appropriate permissions
   - Copy the key to your `.env` file as `PTERO_CLIENT_API_KEY`

2. **Application API Key (Optional)**
   - Log in to your Pterodactyl panel as an administrator
   - Go to Administration > Application API
   - Create a new API key with appropriate permissions
   - Copy the key to your `.env` file as `PTERO_APPLICATION_API_KEY`

### Using the Dashboard

1. **Server Overview**
   - The main page displays all your Minecraft servers
   - Each server card shows status, resource usage, and quick actions
   - Click on a server to access detailed management options

2. **Console Access**
   - Navigate to the Console tab for a server
   - View real-time server logs
   - Send commands using the command input field
   - Use the power buttons to start, stop, or restart the server

3. **Managing Plugins**
   - Go to the Plugins tab
   - View currently installed plugins
   - Search for new plugins from Modrinth
   - Install plugins by selecting a version compatible with your server
   - Remove plugins by clicking the delete button

4. **Managing Mods**
   - Go to the Mods tab
   - View currently installed mods
   - Search for new mods from Modrinth
   - Install mods by selecting a version compatible with your server
   - Remove mods by clicking the delete button

5. **Server Settings**
   - Navigate to the Settings tab
   - Modify server.properties and other configuration files
   - Save changes and restart the server to apply them

6. **Startup Configuration**
   - Go to the Startup tab
   - Customize Java arguments and memory allocation
   - Configure server jar file and other startup parameters

## API Usage

The application provides several API endpoints for client-side JavaScript to interact with:

### Server Management

- `console.php?action=resources&id={serverId}`: Get server resources
- `console.php?action=files&id={serverId}&directory={directory}`: Get files list
- `console.php?action=file_contents&id={serverId}&file={filePath}`: Get file contents
- `console.php?action=send_command&id={serverId}`: Send a command to the server

### Plugin Management

- `plugins.php?action=search&id={serverId}&query={query}`: Search for plugins
- `plugins.php?action=versions&id={serverId}&project_id={projectId}`: Get plugin versions
- `plugins.php?action=server_plugins&id={serverId}`: Get installed plugins
- `plugins.php?action=install&id={serverId}`: Install a plugin (POST request)
- `plugins.php?action=delete&id={serverId}`: Delete a plugin (POST request)

### Mod Management

- `mods.php?action=search&id={serverId}&query={query}`: Search for mods
- `mods.php?action=versions&id={serverId}&project_id={projectId}`: Get mod versions
- `mods.php?action=server_mods&id={serverId}`: Get installed mods
- `mods.php?action=install&id={serverId}`: Install a mod (POST request)
- `mods.php?action=delete&id={serverId}`: Delete a mod (POST request)

### Settings Management

- `settings.php?action=get_file&id={serverId}&file={filePath}`: Get settings file
- `settings.php?action=save_file&id={serverId}`: Save settings file (POST request)

## Troubleshooting

### Common Issues

1. **API Connection Errors**
   - Verify your Pterodactyl panel URL is correct
   - Ensure your API key has the necessary permissions
   - Check network connectivity between the web server and Pterodactyl panel

2. **Permission Errors**
   - Make sure the web server has write permissions to the logs directory
   - Check PHP error logs for detailed error messages

3. **Plugin/Mod Installation Failures**
   - Verify the server has enough disk space
   - Ensure the plugins or mods directory exists on the server
   - Check if the selected version is compatible with your server type

### Debugging

Enable debug mode by adding the following to your `.env` file:
```
DEBUG=true
```

This will provide more detailed error messages and logging.

## Project Structure

```
api/
├── css/                  # CSS styles
│   └── main.css          # Consolidated CSS file
├── includes/             # PHP includes
│   ├── ApiClient.php     # API client for Pterodactyl communication
│   ├── bootstrap.php     # Bootstrap file for initialization
│   ├── Config.php        # Configuration management
│   ├── ContentManager.php # Plugin/mod management
│   ├── Core.php          # Core functionality
│   ├── ModrinthClient.php # Modrinth API client
│   ├── Response.php      # API response handling
│   └── ServerManager.php # Server management
├── js/                   # JavaScript files
│   ├── app.js            # Main JavaScript file
│   ├── console.js        # Console functionality
│   ├── mods.js           # Mod management
│   ├── plugins.js        # Plugin management
│   ├── settings.js       # Settings management
│   └── startup.js        # Startup configuration
├── logs/                 # Log files
├── .htaccess             # Apache configuration
├── api.php               # API endpoint
├── config.php            # Configuration file
├── console.php           # Console page
├── index.php             # Home page
├── mods.php              # Mods page
├── plugins.php           # Plugins page
├── settings.php          # Settings page
├── startup.php           # Startup configuration page
└── README.md             # This file
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Pterodactyl](https://pterodactyl.io/) for the server management panel
- [Modrinth](https://modrinth.com/) for the plugin and mod repository
- [Bootstrap](https://getbootstrap.com/) for the UI framework
- [jQuery](https://jquery.com/) for the JavaScript library