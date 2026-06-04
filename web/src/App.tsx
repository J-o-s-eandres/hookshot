import { Navigate, Route, Routes } from "react-router-dom";
import { CreatePage } from "./features/create/CreatePage";
import { InspectorPage } from "./features/inspector/InspectorPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CreatePage />} />
      <Route path="/w/:token" element={<InspectorPage />} />
      {/* Cualquier ruta desconocida vuelve al inicio. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
