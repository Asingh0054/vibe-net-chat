export default function About() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-8 font-serif">About Us</h1>
        
        <div className="space-y-6 text-foreground/90 leading-relaxed">
          <p>
            Team XV IT presents a smart and secure way to share files and chat directly through peer-to-peer (P2P) technology. Our platform is designed for speed, privacy, and simplicity — allowing users to send and receive files without relying on any third-party servers. Every transfer is protected with end-to-end encryption, ensuring your data stays private and accessible only to you and your receiver.
          </p>

          <p>
            With built-in real-time chat, users can communicate instantly while sharing files, making collaboration faster and smoother. Whether you're sending documents, images, or large media files, Team XV IT provides a reliable and secure solution for seamless sharing.
          </p>

          <div className="mt-12">
            <h2 className="text-2xl font-semibold text-primary mb-4 font-serif">Developed by Team XV IT</h2>
            <ul className="space-y-2 text-foreground/80">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                Sampat Singh Shekhawat
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                Arjun Inda
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                Kapil
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                Ajay Singh Shekhawat
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                Deepak Singh Shekhawat
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                Bhom Singh
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                Himmat
              </li>
            </ul>
          </div>

          <p className="mt-8 text-foreground/90">
            Together, we aim to build tools that combine security, performance, and user-friendliness — empowering people to connect and share freely in a decentralized world.
          </p>

          <p className="mt-8 text-lg font-semibold text-primary">
            Share your files with confidence — P2P encrypted, fast, and private.
          </p>
        </div>
      </div>
    </div>
  );
}
