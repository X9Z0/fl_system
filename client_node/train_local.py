import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader, random_split

# -------------------------------
# 1. Define a simple model
# -------------------------------
class SimpleNN(nn.Module):
    def __init__(self):
        super(SimpleNN, self).__init__()
        self.fc1 = nn.Linear(28*28, 128)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(128, 10)
        self.softmax = nn.LogSoftmax(dim=1)

    def forward(self, x):
        x = x.view(-1, 28*28)
        x = self.relu(self.fc1(x))
        x = self.softmax(self.fc2(x))
        return x


# -------------------------------
# 2. Train the model locally
# -------------------------------
def train_local_model(epochs=1, batch_size=32, lr=0.01):
    transform = transforms.Compose([transforms.ToTensor()])
    dataset = datasets.MNIST(root="./data", train=True, download=True, transform=transform)

    # use smaller subset for speed
    subset_size = 1000
    dataset, _ = random_split(dataset, [subset_size, len(dataset) - subset_size])

    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    model = SimpleNN()
    criterion = nn.NLLLoss()
    optimizer = optim.SGD(model.parameters(), lr=lr)

    model.train()
    for epoch in range(epochs):
        for batch_idx, (data, target) in enumerate(loader):
            optimizer.zero_grad()
            output = model(data)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()

        print(f"Epoch {epoch+1}/{epochs} - Loss: {loss.item():.4f}")

    return model


# -------------------------------
# 3. Serialize model weights
# -------------------------------
def get_model_weights(model):
    return {k: v.cpu().detach().numpy().tolist() for k, v in model.state_dict().items()}


if __name__ == "__main__":
    model = train_local_model()
    weights = get_model_weights(model)
    print("Local training done. Model weights ready to send.")
