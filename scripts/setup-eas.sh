#!/bin/bash
echo "Setting up EAS for Mintenance App..."

echo ""
echo "Step 1: Creating EAS Project"
echo "Y" | npx eas project:init

echo ""
echo "Step 2: Configuring Build Profiles"
echo "Y" | npx eas build:configure

echo ""
echo "Step 3: Displaying Project Info"
npx eas project:info

echo ""
echo "EAS Setup Complete!"
echo "You can now run builds using:"
echo "  npx eas build --platform android --profile development"
echo "  npx eas build --platform android --profile production"
echo ""