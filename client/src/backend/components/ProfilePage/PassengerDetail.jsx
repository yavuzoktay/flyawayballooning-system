import React from "react";

const PassengerDetail = ({ detail }) => {
    return (
        <div className="personal-detail-card passenger-detail" style={{ marginTop: "20px" }}>
            <h2>Passenger Detail</h2>
            <div className="passenger-list-wrap">
                {
                    detail?.passengers?.map((person, index) => {
                        return (
                            <div className="passenger-list" key={index}>
                                <div className="passenger-list-left">
                                    <p><b>Passenger {index + 1}:</b></p>
                                </div>
                                <div className="passenger-list-right">
                                    <div className="passenger-info-wrap">
                                        <p>{person?.name}</p>
                                        <p>{person?.weight}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                }
            </div>
        </div>
    )
}

export default PassengerDetail;