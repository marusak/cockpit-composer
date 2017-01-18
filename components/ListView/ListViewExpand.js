import React, { PropTypes } from 'react';
import ListItemExpand from '../../components/ListView/ListItemExpand';

class ListViewExpand extends React.Component {

  render() {
    const { listItems } = this.props;
    return (
        <div id={this.props.id} className="list-group list-view-pf list-view-pf-view">
          {listItems.map((listItem,i) =>
            <ListItemExpand listItemParent={ this.props.id } isDependency={this.props.isDependency} listItem={listItem} key={i}
              noEditComponent={ this.props.noEditComponent }
              handleRemoveComponent={ this.props.handleRemoveComponent }
              handleComponentDetails={ this.props.handleComponentDetails }
              componentDetailsParent={ this.props.componentDetailsParent } />
          )}
        </div>
    )
  }
}

export default ListViewExpand;