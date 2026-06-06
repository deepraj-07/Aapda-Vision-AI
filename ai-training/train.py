import argparse
import os

import torch
from torch.utils.data import DataLoader, random_split

from dataset import DamageDataset
from model import build_unet_model


def train(args):
    dataset = DamageDataset(args.image_dir, args.mask_dir, image_size=(args.size, args.size))
    val_size = max(1, int(0.1 * len(dataset)))
    train_size = len(dataset) - val_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=2)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = build_unet_model(classes=4).to(device)
    criterion = torch.nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)

    best_val_loss = float("inf")
    for epoch in range(args.epochs):
        model.train()
        train_loss = 0.0
        for images, masks in train_loader:
            images = images.to(device)
            masks = masks.to(device)

            optimizer.zero_grad()
            logits = model(images)
            loss = criterion(logits, masks)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for images, masks in val_loader:
                images = images.to(device)
                masks = masks.to(device)
                logits = model(images)
                loss = criterion(logits, masks)
                val_loss += loss.item()

        train_loss /= max(len(train_loader), 1)
        val_loss /= max(len(val_loader), 1)
        print(f"Epoch {epoch + 1}/{args.epochs} | train_loss={train_loss:.4f} | val_loss={val_loss:.4f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            os.makedirs(os.path.dirname(args.out_model), exist_ok=True)
            torch.save(model.state_dict(), args.out_model)
            print(f"Saved best model to {args.out_model}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train U-Net for 4-class disaster damage segmentation")
    parser.add_argument("--image-dir", type=str, required=True)
    parser.add_argument("--mask-dir", type=str, required=True)
    parser.add_argument("--out-model", type=str, default="data/models/damage_unet_best.pth")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--size", type=int, default=512)
    train(parser.parse_args())
