use futures::lock::Mutex;
use futures::Sink;
use futures::SinkExt;

use futures::channel::mpsc::SendError;

use serde::{Deserialize, Serialize};

use tauri::ipc::InvokeBody;
use tauri::{
    command,
    ipc::{Request},
    State,
};

#[derive(Debug, Serialize, Deserialize)]
pub struct AvailableDevice {
    pub label: String,
    pub id: String,
}

#[derive(Debug, Default)]
pub struct ActiveConnection<'a> {
    pub conn: Mutex<Option<Box<dyn Sink<Vec<u8>, Error = SendError> + Unpin + Send + 'a>>>,
}

#[command]
pub async fn transport_send_data(
    req: Request<'_>,
    state: State<'_, ActiveConnection<'_>>,
) -> Result<(), String> {
    if let InvokeBody::Raw(data) = req.body() {
        let mut lock = state.conn.lock().await;

        // Neither of these may be swallowed. The sink is gone once the write
        // task has ended, and its `SendError` was being dropped on the floor —
        // so a request would silently never leave the host while the client sat
        // waiting for a response to it, holding the RPC mutex, forever. Failing
        // the invoke instead errors the transport's writable stream, which
        // aborts the connection and lets every pending call reject.
        let sink = lock.as_mut().ok_or("Not connected")?;
        sink.send(data.clone())
            .await
            .map_err(|e| format!("Failed to send to the device: {}", e))?;
    }

    Ok(())
}

#[command]
pub async fn transport_close(
    req: Request<'_>,
    state: State<'_, ActiveConnection<'_>>,
) -> Result<(), ()> {
    *state.conn.lock().await = None;

    Ok(())
}
