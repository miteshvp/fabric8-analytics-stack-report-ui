import {
    Component,
    Input,
    OnChanges,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
import {
    Observable
} from 'rxjs/Observable';
import {
    ReportSummaryUtils
} from '../utils/report-summary-utils';

import {
    StackAnalysesService
} from '../stack-analyses.service';
import {
    getStackReportModel
} from '../utils/stack-api-utils';
import {
    StackReportModel,
    ResultInformationModel,
    UserStackInfoModel,
    ComponentInformationModel,
    RecommendationsModel
} from '../models/stack-report.model';

/**
 * New Stack Report Revamp - Begin
 */
import {
    MCardDetails,
    MGenericStackInformation
} from '../models/ui.model';
import {
    SaveState
} from '../utils/SaveState';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
/**
 * New Stack Report Revamp - End
 */

@Component({
    selector: 'stack-details',
    templateUrl: './stack-details.component.html',
    providers: [StackAnalysesService],
    encapsulation: ViewEncapsulation.None,
    styleUrls: ['./stack-details.component.less']
})

export class StackDetailsComponent implements OnChanges {
    @Input() stack: string;
    @Input() gatewayConfig;
    @Input() displayName;
    @Input() repoInfo;
    @Input() buildNumber;
    @Input() appName;
    @Input() stackResponse;

    @ViewChild('crowdModule') modalCrowdModule: any;

    /**
     * New Stack Report Revamp - Begin
     */
    public cardDetails: any = {};
    public genericInformation: MGenericStackInformation = null;
    /**
     * New Stack Report Revamp - End
     */

    public errorMessage: any = {};
    public cache: string = '';
    public cacheResponse: any;
    public modalHeader: string = null;
    public userStackInformation: UserStackInfoModel;
    public componentLevelInformation: any = {};
    public userComponentInformation: Array < ComponentInformationModel > = [];
    public companionLevelRecommendation: any = {};
    public dataLoaded: boolean = false;
    public recommendationsArray: Array < RecommendationsModel > = [];
    public stackLevelOutliers: any = {};

    public companionLevel: any = {};
    public componentLevel: any = {};

    public componentFilterBy: string = '';
    public customClass: string = 'accordion-custom';
    public analysis: any = {};


    public feedbackConfig: any = {};

    public tabs: Array < any > = [];

    private userStackInformationArray: Array < UserStackInfoModel > = [];
    private totalManifests: number;

    private stackId: string;
    private subPolling: any;

    private alive = true;

    private reportSummaryUtils = new ReportSummaryUtils();

    /**
     * New Stack Report Revamp - Begin
     */
    public handleCardClick(cardDetails: any): void {
        this.genericInformation = new MGenericStackInformation(
            this.stackId,
            this.getBaseUrl(this.stack),
            this.gatewayConfig && this.gatewayConfig['access_token']
        );
        this.cardDetails = cardDetails;
    }
    /**
     * New Stack Report Revamp - End
     */

    public showStackModal(event: Event): void {
        event.preventDefault();
    }

    public showCrowdModal(): void {
        // event.preventDefault();
        this.modalCrowdModule.open();
    }

    /**
     * Gets triggered on close of modal,
     * Clears the existing states to make it proper on open
     */
    public handleModalClose(): void {
        this.resetFields();
    }

    public tabSelection(tab: any): void {
        if (tab) {
            tab['active'] = true;
            let currentIndex: number = tab['index'];
            let recommendations: RecommendationsModel = this.recommendationsArray[currentIndex];
            let alternate: number = 0,
                companion: number = 0;
            if (recommendations && recommendations !== null && recommendations !== undefined) {
                this.stackLevelOutliers = {
                    'usage': recommendations.usage_outliers
                };
                this.companionLevelRecommendation = {
                    dependencies: recommendations.companion,
                    manifestinfo: tab.content.manifest_name,
                    licenseAnalysis: tab.content.user_stack_info.license_analysis
                };
                alternate = recommendations.alternate ? recommendations.alternate.length : 0;
                companion = recommendations.companion ? recommendations.companion.length : 0;
            }
            let total: number = 0;
            let analyzed: number = 0;
            let unknown: number = 0;

            if (tab.content && tab.content.user_stack_info) {
                let userStackInfo: UserStackInfoModel = tab.content.user_stack_info;
                if (userStackInfo.dependencies) {
                    analyzed = userStackInfo.analyzed_dependencies.length;
                }
                if (userStackInfo.analyzed_dependencies) {
                    total = userStackInfo.dependencies.length;
                }
                if (userStackInfo.unknown_dependencies) {
                    unknown = userStackInfo.unknown_dependencies.length;
                }
            }

            this.analysis = {
                stackLevel: 'Total: ' + total + ' | Analyzed: ' + analyzed + ' | Unknown: ' +
                    unknown,
                alternate: '[' + alternate + ' alternate dependencies match your stack ' +
                    'composition and may be more appropriate]',
                companion: '[' + companion + ' additional dependencies are often used by ' +
                    'similar stacks]'
            };
            this.componentLevelInformation = {
                recommendations: recommendations,
                dependencies: tab.content.user_stack_info.analyzed_dependencies,
                manifestinfo: tab.content.manifest_name,
                licenseAnalysis: tab.content.user_stack_info.license_analysis
            };
            // Select the first card by default
            if (SaveState && SaveState.ELEMENTS && SaveState.ELEMENTS.length > 0) {
                if (SaveState.ELEMENTS[currentIndex * 4]) {
                    SaveState.ELEMENTS[currentIndex * 4].click();
                }
            }
        }
    }

    public tabDeSelection(tab: any): void {
        if (tab) {
            tab['active'] = false;
        }
    }

    ngOnChanges(): void {
        if (this.stack && this.stack !== this.cache) {
            this.cache = this.stack;
            this.resetFields();
            this.stackId = this.stack && this.stack.split('/')[this.stack.split('/').length - 1];
            // this.init(this.stack);
            this.initFeedback();
            this.componentLevel = {
                header: 'Analysis of your application stack',
                subHeader: 'Recommended alternative dependencies'
            };
            this.companionLevel = {
                header: 'Possible companion dependencies',
                subHeader: 'Consider theses additional dependencies'
            };
            this.displayName = this.displayName || 'Stack Report';
            this.init();
        }
    }

    public handleChangeFilter(filterBy: any): void {
        this.componentFilterBy = filterBy.filterBy;
    }

    constructor(private stackAnalysisService: StackAnalysesService) {}

    /**
     * New Revamp - Begin
     * https://recommender.api.openshift.io/api/v1/stack-analyses/
     */
    private getBaseUrl(url: string): string {
        if (url && url !== '') {
            let splitter: string = 'api/v1';
            return url.indexOf(splitter) !== -1 ? url.split(splitter)[0] : '';
        }
        return '';
    }
    /**
     * New Revamp - End
     */

    private handleError(error: any): void {
        this.errorMessage = error;
        this.modalHeader = error.title;
        this.dataLoaded = true;
    }

    private initFeedback(): void {
        this.feedbackConfig = {
            name: 'Feedback',
            stackId: this.stackId,
            title: 'Tell us your experience',
            poll: [{
                question: 'How useful do you find this?',
                type: 'rating'
            }, {
                question: 'How likely do you recommend this to others?',
                type: 'rating'
            }, {
                question: 'Tell us more',
                type: 'text'
            }]
        };
    }

    private resetFields(): void {
        this.tabs.length = 0;
        this.dataLoaded = false;
        this.errorMessage = null;
        this.recommendationsArray = [];
        this.stackLevelOutliers = {};
        this.componentLevelInformation = {};
        this.companionLevelRecommendation = {};
        this.cacheResponse = {};
        SaveState.ELEMENTS = [];
        // this.dataLoaded = false;
    }

    private handleResponse(data: any): void {
        this.errorMessage = null;
        this.tabs = [];
        SaveState.ELEMENTS = [];
        if (data && (!data.hasOwnProperty('error') && Object.keys(data).length !== 0)) {
            if (data.hasOwnProperty('result') && data.result instanceof Array &&
                data.result.length > 0 &&
                data.result[0].hasOwnProperty('recommendation') && data.result[0].recommendation &&
                data.result[0].recommendation.hasOwnProperty('alternate')) {
                    this.alive = false;
                    this.subPolling.unsubscribe();
            }
            let resultInformation: Observable < StackReportModel > = getStackReportModel(data);
            resultInformation.subscribe((response) => {
                let result: Array < ResultInformationModel > = response.result;
                this.totalManifests = result.length;
                if (this.totalManifests > 0) {
                    this.userStackInformationArray = result.map((r) => r.user_stack_info);
                    result.forEach((r, index) => {
                        let warning: any = this.ifManifestHasWarning(r);
                        let tab = {
                            title: r.manifest_file_path,
                            content: r,
                            index: index,
                            hasWarning: warning.has,
                            severity: warning.severity
                        };
                        this.tabs.push(tab);
                        this.recommendationsArray.push(r.recommendation);
                    });
                    this.modalHeader = 'Updated just now';
                    this.dataLoaded = true;
                    this.tabSelection(this.tabs[0]);
                }
            });
        } else if (data && data.hasOwnProperty('error')) {
            this.handleError({
                message: 'Your report is getting generated. Please revisit.',
                code: data.statusCode,
                title: ''
            });
        } else {
            this.handleError({
                message: data.error,
                code: data.statusCode,
                title: 'Report failed'
            });
        }
    }

    private ifManifestHasWarning(manifest: ResultInformationModel): any {
        let securityInfo = this.reportSummaryUtils.getSecurityReportCard(manifest.user_stack_info);
        let isSecurityWarning = securityInfo.hasWarning;
        let isInsightsWarning = this.reportSummaryUtils.getInsightsReportCard(manifest.recommendation).hasWarning;
        let isLicenseWarning = this.reportSummaryUtils.getLicensesReportCard(manifest.user_stack_info).hasWarning;
        return {
            has: isSecurityWarning || isInsightsWarning || isLicenseWarning,
            severity: (isSecurityWarning && securityInfo.severity) || 2
        };
    }

    private init(): void {
        let counter = 2;
        if (this.gatewayConfig["modal"]) {
            this.showCrowdModal();
        }
        if (this.stackResponse && this.cacheResponse !== this.stackResponse) {
            this.cacheResponse = this.stackResponse;
            // Change this to some other logic
            setTimeout(() => {
                this.handleResponse(this.stackResponse);
            }, 1000);
        } else {
            if (this.stack && this.stack !== '') {
                let analysis: Observable < any > = this.stackAnalysisService
                    .getStackAnalyses(this.stack, this.gatewayConfig);

                if (analysis) {
                    TimerObservable .create(0, 10000)
                                    .takeWhile(() => this.alive)
                                    .subscribe(() => {
                                        
                                        if (counter -- === 0) {
                                            this.alive = false;
                                            this.subPolling.unsubscribe();
                                        }
                                
                                this.subPolling = analysis.subscribe((data) => {
                                    this.handleResponse(data);
                                },
                                error => {
                                    let title: string = '';
                                    if (error.status >= 500) {
                                        title = 'Something unexpected happened';
                                    } else if (error.status === 404) {
                                        title = 'You are looking for something which isn\'t there';
                                    } else if (error.status === 401) {
                                        title =
                                            'You don\'t seem to have sufficient privileges to access this';
                                    }
                                    title = 'Report failed'; // Check if just this message is enough.
                                    this.handleError({
                                        message: error.statusText,
                                        status: error.status,
                                        title: title
                                    });
                                });
                            });
                }
            }
        }
    }
}
