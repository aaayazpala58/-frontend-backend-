import UploadForm from "./UploadForm";


function App() {
  return (
    <div style={{ maxWidth: 800, margin: "20px auto", fontFamily: "sans-serif" }}>
      <h2>NIYAMR PDF Checker</h2>
      <p>Upload a PDF to extract text and analyze it.</p>

      <UploadForm />
    </div>
  );
}

export default App;
