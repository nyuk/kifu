# Pending Issues & Next Steps

## Immediate Priority
1. **Wait for user testing feedback** on bubble aggregation:
   - Are all trades showing on all timeframes?
   - Is the "N개 거래" aggregation working correctly?
   - Are hover tooltips showing properly?

## If User Reports Issues

### If bubbles still not showing:
- Check browser console logs: "=== Bubble Aggregation Debug ==="
- Verify `floorToCandle()` calculation is correct
- Check coordinate conversion (timeToCoordinate, priceToCoordinate)

### If aggregation not grouping correctly:
- Verify timeframe seconds calculation in `getTimeframeSeconds()`
- Check Map grouping logic in useEffect (line 261-310)
- Ensure bubble data has correct `candle_time` format

### If hover tooltip not showing:
- Check CSS classes: `group` and `group-hover:block`
- Verify tooltip positioning (absolute, z-20)

## Unresolved User Requests (Original Issues)

### #6: AI Dummy Data
- **Status**: User asked about it, need to clarify if still needed
- **Question**: What kind of dummy data? Sample trades? AI opinions?

### #7: Trade Pattern Analysis
- **Status**: Need specific requirements
- **Question**: What patterns to analyze? Entry/exit timing? Profit/loss ratios?

### #8: Upbit API Integration
- **Status**: Binance already works, Upbit is Korean exchange
- **Question**: Priority level? Should this be next feature?

## Potential Improvements

### Bubble Features
- [ ] Click existing bubble to edit/delete (currently only logs to console)
- [ ] Drag bubbles to adjust position
- [ ] Better tooltip design for many trades (pagination?)
- [ ] Pagination or infinite scroll for trades list

### UI/UX
- [ ] Dark mode support
- [ ] Mobile responsiveness improvements
- [ ] Keyboard shortcuts for common actions

### Data & Analytics
- [ ] Trade statistics dashboard
- [ ] Performance charts (PnL over time)
- [ ] Export trades to various formats

## Questions for User

1. **버블 집계 기능을 테스트해보셨나요?** (Have you tested the bubble aggregation?)
2. **모든 timeframe에서 거래들이 제대로 보이나요?** (Are trades showing properly on all timeframes?)
3. **AI 더미 데이터가 아직 필요한가요?** (Is AI dummy data still needed?)
4. **거래 패턴 분석의 구체적인 요구사항은 무엇인가요?** (What are specific requirements for trade pattern analysis?)
5. **Upbit API 연동의 우선순위는 어떻게 되나요?** (What is the priority for Upbit API integration?)
