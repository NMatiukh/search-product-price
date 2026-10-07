import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {ConfigProvider} from 'antd'
import './index.css'
import App from './components/App/App.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#b2432f',
                    colorInfo: '#315b58',
                    colorText: '#25231f',
                    colorTextSecondary: '#686052',
                    colorBgContainer: '#f4ecd8',
                    colorBorder: '#2f3e3b',
                    borderRadius: 2,
                    fontFamily: '"Courier Prime", "Courier New", monospace',
                    controlHeight: 42,
                },
                components: {
                    Button: {fontWeight: 700},
                    Input: {activeShadow: '3px 3px 0 rgba(49, 91, 88, .25)'},
                    Select: {activeOutlineColor: 'rgba(49, 91, 88, .25)'},
                    Table: {
                        headerBg: '#315b58',
                        headerColor: '#fff8e8',
                        headerSplitColor: '#e9d7b1',
                        borderColor: '#a99c82',
                        rowHoverBg: '#f0ddb3',
                    },
                    Modal: {headerBg: '#f4ecd8', contentBg: '#f4ecd8'},
                },
            }}
        >
            <App/>
        </ConfigProvider>
    </StrictMode>,
)
