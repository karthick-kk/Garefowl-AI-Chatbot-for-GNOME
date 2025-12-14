# Makefile for Penguin AI Chatbot GNOME Shell Extension

EXTENSION_UUID = garefowl-ai-chatbot@karthickk.gitlab.com
EXTENSION_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(EXTENSION_UUID)

.PHONY: install enable disable package clean

install:
	@echo "Installing extension to $(EXTENSION_DIR)"
	mkdir -p $(EXTENSION_DIR)
	rsync -a --delete . $(EXTENSION_DIR) --exclude .git --exclude Makefile
	@echo "Installed. Restart GNOME Shell (Alt+F2, r, Enter) or log out/in."

enable:
	@echo "Enabling extension $(EXTENSION_UUID)"
	gnome-extensions enable $(EXTENSION_UUID)

disable:
	@echo "Disabling extension $(EXTENSION_UUID)"
	gnome-extensions disable $(EXTENSION_UUID)

package:
	@echo "Packaging extension as zip..."
	zip -r $(EXTENSION_UUID).zip . -x '*.git*' 'Makefile' '*.zip'
	@echo "Created $(EXTENSION_UUID).zip"

clean:
	@echo "Cleaning up zip files..."
	rm -f $(EXTENSION_UUID).zip
