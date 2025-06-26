    const PersonalDetail = ({ detail, email }) => {
        var passenger = detail?.passengers;
        var filteredPassengers = passenger?.filter((passenger) => passenger.email === email);
        
        return (
            <div className="personal-detail-card">
                <h2>Personal Details</h2>
                <div className="detail-cont-wrap">
                    <p><b>Booking Name:</b> {filteredPassengers?.[0]?.name}</p>
                </div>
                <div className="detail-cont-wrap">
                    <p><b>Booking Created:</b> {detail.created}</p>
                </div>
                <div className="detail-cont-wrap">
                    <p><b>Tel:</b> <Link to={`tel:${filteredPassengers?.[0]?.phone}`}>{filteredPassengers?.[0]?.phone}</Link></p>
                </div>
                <div className="detail-cont-wrap">
                    <p><b>Email:</b> <Link to={`mailto:${filteredPassengers?.[0]?.email}`}>{filteredPassengers?.[0]?.email}</Link></p>
                </div>
                <div className="detail-cont-wrap">
                    <p><b>Flight Attempts:</b> {detail.flight_attempts}</p>
                </div>
                <div className="detail-cont-wrap">
                    <p><b>Expires:</b> {detail.expires}</p>
                </div>
                <div className="detail-cont-wrap">
                    <p><b>Paid:</b> {detail.paid}</p>
                </div>
            </div>
        )
    }

    export default PersonalDetail;