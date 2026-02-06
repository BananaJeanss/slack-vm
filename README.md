<div align="center">
<img src="https://github.com/BananaJeanss/slack-vm/blob/main/assets/slackvmlogo.png?raw=true" width="200" />
</div>

# slack-vm

Control a QEMU VM, through slack!

## Commands

| Command                    | Description                                                                                  | Example Usage               |
| :------------------------- | :------------------------------------------------------------------------------------------- | :-------------------------- |
| `print`                    | Takes a screenshot of the VM's current screen.                                               | `print`                     |
| `key <key> [hold]`         | Presses a single key on the VM.                                                              | `key enter`, `key left 500` |
| `keypress <key>`           | Presses a specific key followed immediately by the `enter` key.                              | `keypress return`           |
| `combo <keys>`             | Executes a key combination. Use `+` to separate keys.                                        | `combo ctrl+alt+delete`     |
| `type <text>`              | Types a sequence of characters into the VM.                                                  | `type echo "hello world"`   |
| `move <dir> <px>`          | Moves the mouse cursor in a direction (`up`, `down`, `left`, `right`) by a number of pixels. | `move right 100`            |
| `click <button>`           | Performs a mouse click with the specified button (`left`, `right`, or `middle`).             | `click left`                |
| `doubleclick <button>`     | Performs a double mouse click with the specified button.                                     | `doubleclick left`          |
| `tripleclick <button>`     | Performs a triple mouse click with the specified button.                                     | `tripleclick left`          |
| `scroll <amount>`          | Scrolls the mouse wheel by the specified amount (positive for up, negative for down).        | `scroll -50`                |
| `drag <button> <dir> <px>` | Drags the mouse while holding the specified button in a direction by a number of pixels.     | `drag left down 200`        |
| `restart`                  | Votes to restart the VM.                                                                     | `restart`                   |
| `uptime`                   | Displays the bot and VM uptime.                                                              | `uptime`                    |

> [!NOTE]
> You can add # in front of your messages for it to be ignored by the bot.

## Dev Setup

Requirements:

- [Bun](https://bun.sh)
- [QEMU](https://www.qemu.org)

1. Install dependencies

   ```bash
   bun install
   ```

2. Create a qcow disk and download an ISO

   ```bash
   # replace ./isos/ with the path you want to create it in & 10G with desired capacity
   qemu-img create -f qcow2 ./isos/ 10G
   # OR
   bun run create-qcow2
   ```

3. (Optional) Setup a user for the bot to use (for security, includes iptables to block local network access)

   ```bash
   bun run setup-user
   ```

4. Create a `.env` file in the root directory, based on the `.env.example` file.

   ```bash
   cp .env.example .env
   nano .env
   ```

5. Run the bot

   ```bash
   bun start
   ```

## LICENSE

[MIT License](LICENSE) yadayada
