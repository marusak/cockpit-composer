import React, { PropTypes } from 'react';
import Link from '../../components/Link';
import Layout from '../../components/Layout';
import RecipeContents from '../../components/ListView/RecipeContents';
import ComponentInputs from '../../components/ListView/ComponentInputs';
import ComponentDetailsView from '../../components/ListView/ComponentDetailsView';
import CreateComposition from '../../components/Modal/CreateComposition';
import EmptyState from '../../components/EmptyState/EmptyState';
import constants from '../../core/constants';

class EditRecipePage extends React.Component {

  state = { selectedComponent: "", selectedComponentStatus: "", selectedComponentParents: [], recipecomponents: [], inputcomponents: [], recipedependencies: [] };

  componentDidMount() {
    document.title = 'Composer | Recipe';
  }

  componentWillMount() {
    this.getDependencies();
    Promise.all([this.getRecipe(), this.getInputs()]).then((data) => {
      // if state is set in getRecipe(), then why is it set here?
      this.setState({recipecomponents : data[0][this.props.route.params.recipe]['modules']});
      this.setState({inputcomponents : data[1].modules});
      this.updateInputs();
    }).catch(e => console.log('Error in EditRecipe promise: ' + e));
  }

  getRecipe() {
    let recipeName = this.props.route.params.recipe;
    let p = new Promise((resolve, reject) => {
      //fetch(constants.get_recipe_url).then(r => r.json())
      fetch(constants.get_recipe_api_url + recipeName)
        .then(r => r.json())
        .then(data => {
          this.setState({recipecomponents : data[recipeName]['modules']});
          resolve(data);
        })
        .catch(e => {
          console.log("Failed to fetch recipe during edit: " + e);
          reject();
          }
        );
    });
    return p;
  }

  getInputs(){
    let p = new Promise((resolve, reject) => {
      fetch(constants.get_components_url).then(r => r.json())
        .then(data => {
          // add type: module to each one, save the list
          this.setState({inputcomponents : data.modules.map(m => {
                                              m.type = "module";
                                              return m;
                                           })
                        })
                        resolve(data);
        })
        .catch(e => {
          console.log("Failed to get inputs during recipe edit: " + e);
          reject();
          }
        );
    });
    return p;
  }
  getDependencies() {
    let that = this;
    fetch(constants.get_dependencies_url).then(r => r.json())
      .then(data => {
        that.setState({recipedependencies : data})
      })
      .catch(e => console.log("no dependencies"));
  }

  updateInputs() {
    // this adds a property to the original data set of inputs, that indicates whether the input is in the recipe or not
    // for each object in recipecomponents, get indexOf value in inputcomponents, add a property to the matching inputcomponent "inRecipe = true"
    // this should run once on did mount, and then individually per added/removed component
    let inputs = this.state.inputcomponents;
    let recipeLength = this.state.recipecomponents.length;
    for (var i = 0; i < recipeLength; i++) {
      let component = this.state.recipecomponents[i];
      let index = inputs.map(function(e) {return e.name}).indexOf(component.name);
      if (index >= 0) {
          inputs[index].inRecipe = true;
      }
    }
    this.setState({inputcomponents: inputs});

  }

  clearInputAlert() {
    $("#cmpsr-recipe-inputs .alert").remove();
  }

  handleAddComponent = (event, component, version) => {
    // the user clicked Add in the sidebar to add the component to the recipe
    // NOTE: how inputcomponents are getting updated may need to be refactored
    // to explicitly use this.setState after setting .inRecipe = true
    let newcomponent = component;
    newcomponent.inRecipe = true;
    if (version != "") {
        newcomponent.version = version;
    }
    let recipecomponents = this.state.recipecomponents.slice(0);
    let updatedrecipecomponents = recipecomponents.concat(newcomponent);
    this.setState({recipecomponents: updatedrecipecomponents});
    let inputs = this.removeInputActive();
    this.setState({inputcomponents: inputs});
    this.setState({selectedComponent: ""});
    this.setState({selectedComponentStatus: ""});
    this.clearInputAlert();
  };

  handleRemoveComponent = (event, component) => {
    // the user clicked Remove for a component in the recipe component list
    // or the component details view
    let inputs = [];
    // if the removed component was visible in the details view:
    if (component == this.state.selectedComponent) {
      inputs = this.removeInputActive();
      this.hideComponentDetails();
    } else {
      inputs = this.state.inputcomponents.slice(0);
    }
    // update the list of components to include the Add button for the removed component
    let input = inputs.map(function(e) {return e.name}).indexOf(component.name);
    if (input > -1) {
      inputs[input].inRecipe = false;
      this.setState({inputcomponents: inputs});
    }
    // update the list of recipe components to not include the removed component
    let index = this.state.recipecomponents.indexOf(component);
    let count = this.state.recipecomponents.length;
    let updatedrecipecomponents = this.state.recipecomponents.slice(0);
    if (index == 0) {
      updatedrecipecomponents =  this.state.recipecomponents.slice(index + 1, count);
    } else if (index + 1 == count) {
      updatedrecipecomponents = this.state.recipecomponents.slice(0, index);
    } else {
      let slice1 = this.state.recipecomponents.slice(0, index);
      let slice2 = this.state.recipecomponents.slice(index + 1, count);
      updatedrecipecomponents = slice1.concat(slice2);
    }
    this.setState({recipecomponents: updatedrecipecomponents});



  };

  handleComponentDetails = (event, component, parent) => {
    // the user selected a component in the sidebar to view more details on the right
    // remove the active state from the current selected component
    let inputs = this.removeInputActive();
    if (component != this.state.selectedComponent) {
      // if the user did not clicked on the current selected component:
      // set state for selected component and recipe status
      this.setState({selectedComponent: component});

      // if the selected component is in the list of inputs
      // then set active to true so that it is highlighted
      let compIndex = inputs.indexOf(component)
      if (compIndex >= 0) {
        inputs[compIndex].active = true;
      }
      this.setState({inputcomponents: inputs});

      // update the breadcrumb
      let parents = this.state.selectedComponentParents.slice(0);
      let updatedParents = [];
      let breadcrumbIndex = parents.indexOf(component);
      //check if the selected component is a breadcrumb node
      // if it is in the breadcrumb, then the breadcrumb path should be updated
      if ( breadcrumbIndex == 0) {
        // if the user clicks the first node in the breadcrumb, it is removed.
        updatedParents = [];
      } else if ( breadcrumbIndex >= 1) {
        // if the user clicks any other node in the breadcrumb, then the array
        // is truncated to show only the parents of the selected component
        updatedParents = parents.slice(0, breadcrumbIndex);
      } else if (parent != undefined) {
      // otherwise, update the list of parents if a parent is provided
        updatedParents = parents.concat(parent);
      }
      this.setState({selectedComponentParents: updatedParents});

      // set status
      // status could be: available, selected, available-child, selected-child
      // (selected and selected-child may or may not be merged depending on what actions are available)
      // if the component is in the recipe and has no parent, it's available
      if ( component.inRecipe == true ) {
          this.setState({selectedComponentStatus: "selected"});
      } else {
        if ( parent == undefined ) {
          this.setState({selectedComponentStatus: "available"});
        } else {
          if ( updatedParents[0].inRecipe == true ) {
            this.setState({selectedComponentStatus: "selected-child"});
          } else {
            this.setState({selectedComponentStatus: "available-child"});
          }
        }
      }

    } else {
      // if the user clicked on the current selected component:
      this.hideComponentDetails();
    }
  };

  hideComponentDetails() {
    this.setState({selectedComponent: ""});
    this.setState({selectedComponentStatus: ""});
    this.setState({selectedComponentParents: []});
  }

  removeInputActive() {
    // remove the active state from list of inputs
    let inputs = this.state.inputcomponents.slice(0);
    let index = inputs.indexOf(this.state.selectedComponent)
    if (index >= 0) {
      inputs[index].active = false;
    }
    return inputs;
  }

  render() {

    return (
      <Layout className="container-fluid container-pf-nav-pf-vertical">
        <div className="cmpsr-edit-actions">
          <button className="btn btn-primary" type="button">Save</button> <button className="btn btn-default" type="button">Cancel</button>
        </div>
				<ol className="breadcrumb">
					<li><Link to="/recipes">Back to Recipes</Link></li>
					<li><Link to={"/recipe/" + this.props.route.params.recipe }>{this.props.route.params.recipe}</Link></li>
					<li className="active"><strong>Edit Recipe</strong></li>
				</ol>
        <div className="cmpsr-title-summary">
          <h1 className="cmpsr-title-summary__item">{ this.props.route.params.recipe }</h1><p className="cmpsr-title-summary__item">Version 3<span className="text-muted">, Total Disk Space: 1,234 KB</span></p>
        </div>
        <div className="row">

          { this.state.selectedComponent == "" &&
          <div className="col-sm-7 col-md-8 col-sm-push-5 col-md-push-4" id="cmpsr-recipe-list">
						<div className="row toolbar-pf">
		          <div className="col-sm-12">
		            <form className="toolbar-pf-actions">
		              <div className="form-group toolbar-pf-filter">
		                <label className="sr-only" htmlFor="filter">Name</label>
		                <div className="input-group">
		                  <div className="input-group-btn">
		                    <button type="button" className="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Name<span className="caret"></span></button>
		                    <ul className="dropdown-menu">
		                      <li><a href="#">Name</a></li>
		                      <li><a href="#">Version</a></li>
		                    </ul>
		                  </div>
		                  <input type="text" className="form-control" id="filter" placeholder="Filter By Name..." />
		                </div>
		              </div>
		              <div className="form-group">
		                <div className="dropdown btn-group">
		                  <button type="button" className="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Name<span className="caret"></span></button>
		                  <ul className="dropdown-menu">
		                    <li><a href="#">Name</a></li>
		                    <li><a href="#">Version</a></li>
		                  </ul>
		                </div>
		                <button className="btn btn-link" type="button"><span className="fa fa-sort-alpha-asc"></span></button>
		              </div>
		              <div className="form-group">
										<button className="btn btn-default" id="cmpsr-btn-crt-compos" data-toggle="modal" data-target="#cmpsr-modal-crt-compos" type="button">Create Composition</button>
		                <div className="dropdown btn-group  dropdown-kebab-pf">
		                  <button className="btn btn-link dropdown-toggle" type="button" id="dropdownKebab" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><span className="fa fa-ellipsis-v"></span></button>
		                  <ul className="dropdown-menu " aria-labelledby="dropdownKebab">
		                    <li><a href="#">Export Recipe</a></li>
												<li role="separator" className="divider"></li>
												<li><a href="#">Update Selected Components</a></li>
												<li><a href="#">Remove Selected Components</a></li>
		                  </ul>
		                </div>
		              </div>
		              <div className="toolbar-pf-action-right">
		                <div className="form-group toolbar-pf-find">
		                  <button className="btn btn-link btn-find" type="button"><span className="fa fa-search"></span></button>
		                  <div className="find-pf-dropdown-container"><input type="text" className="form-control" id="find" placeholder="Find By Keyword..." />
		                    <div className="find-pf-buttons">
		                      <span className="find-pf-nums">1 of 3</span>
		                      <button className="btn btn-link" type="button"><span className="fa fa-angle-up"></span></button>
		                      <button className="btn btn-link" type="button"><span className="fa fa-angle-down"></span></button>
		                      <button className="btn btn-link btn-find-close" type="button"><span className="pficon pficon-close"></span></button>
		                    </div>
		                  </div>
		                </div>
		                <div className="form-group toolbar-pf-view-selector">
		                  <button className="btn btn-link" title="Table View"><i className="fa fa-th"></i></button>
		                  <button className="btn btn-link " title="Tree View"><i className="pficon pficon-topology"></i></button>
		                  <button className="btn btn-link active" title="List View"><i className="fa fa-th-list"></i></button>
		                </div>
		              </div>
		            </form>
		            <div className="row toolbar-pf-results toolbar-pf-results-none">
		              <div className="col-sm-12">
		                <h5>40 Results</h5>
		                <p>Active filters: </p>
		                <ul className="list-inline">
		                  <li><span className="label label-info">Name: nameofthething<a href="#"><span className="pficon pficon-close"></span></a></span></li>
		                  <li><span className="label label-info">Version: 3<a href="#"><span className="pficon pficon-close"></span></a></span></li>
		                  <li><span className="label label-info">Lifecycle: 5<a href="#"><span className="pficon pficon-close"></span></a></span></li>
		                </ul>
		                <p><a href="#">Clear All Filters</a></p>
		              </div>
		            </div>
		          </div>
		        </div>
            { this.state.recipecomponents.length == 0 &&
            <EmptyState title={"Add Recipe Components"} message={"Browse or search for components, then add them to the recipe."} />
            ||
            <RecipeContents components={ this.state.recipecomponents } dependencies={ this.state.recipecomponents } handleRemoveComponent={this.handleRemoveComponent.bind(this)} handleComponentDetails={this.handleComponentDetails.bind(this)} />
            }
					</div>
          ||
          <div className="col-sm-7 col-md-8 col-sm-push-5 col-md-push-4" id="cmpsr-recipe-details">
            <ComponentDetailsView
              component={ this.state.selectedComponent }
              componentParents={ this.state.selectedComponentParents }
              status={ this.state.selectedComponentStatus }
              handleComponentDetails={this.handleComponentDetails.bind(this)}
              handleAddComponent={this.handleAddComponent.bind(this)}
              handleRemoveComponent={this.handleRemoveComponent.bind(this)} />
          </div>
          }

          <div className="col-sm-5 col-md-4 col-sm-pull-7 col-md-pull-8 sidebar-pf sidebar-pf-left" id="cmpsr-recipe-inputs">

						<div className="row toolbar-pf">
							<div className="col-sm-12">
								<form className="toolbar-pf-actions">
									<div className="form-group toolbar-pf-filter">
										<label className="sr-only" htmlFor="filter">Name</label>
										<div className="input-group">
											<div className="input-group-btn">
												<button type="button" className="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Name <span className="caret"></span></button>
												<ul className="dropdown-menu">
													<li><a href="#">Type</a></li>
													<li><a href="#">Name</a></li>
													<li><a href="#">Version</a></li>
													<li><a href="#">Release</a></li>
													<li><a href="#">Lifecycle</a></li>
													<li><a href="#">Support Level</a></li>
												</ul>
											</div>
											<input type="text" className="form-control" id="filter" placeholder="Filter By Name..." />
										</div>
									</div>
									<div className="toolbar-pf-action-right">
										<div className="form-group toolbar-pf-settings">
											<button className="btn btn-link btn-settings" type="button" data-toggle="modal" data-target="#cmpsr-recipe-inputs-settings">
												<span className="pf-icon pficon-settings"></span>
											</button>
										</div>
									</div>
								</form>

								<div className="row toolbar-pf-results" data-results="1">
									<div className="col-sm-12">
										<div className="cmpsr-recipe-inputs-pagination">
											2,345 Available Components
										</div>
									</div>
								</div>
							</div>
						</div>

						<div className="alert alert-info alert-dismissable">
						  <button type="button" className="close" data-dismiss="alert" aria-hidden="true">
						    <span className="pficon pficon-close"></span>
						  </button>
						  <span className="pficon pficon-info"></span>
						  <strong>Select components</strong> in this list to add to the recipe.
						</div>

						<ComponentInputs components={ this.state.inputcomponents } handleComponentDetails={this.handleComponentDetails.bind(this)} handleAddComponent={this.handleAddComponent.bind(this)} />
					</div>
				</div>
				<CreateComposition />

      </Layout>

    );
  }

}

export default EditRecipePage;