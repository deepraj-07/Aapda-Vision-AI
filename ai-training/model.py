import segmentation_models_pytorch as smp


def build_unet_model(encoder_name: str = "resnet34", in_channels: int = 3, classes: int = 4):
    model = smp.Unet(
        encoder_name=encoder_name,
        encoder_weights="imagenet",
        in_channels=in_channels,
        classes=classes,
    )
    return model
